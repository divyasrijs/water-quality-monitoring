// index.js — Water Quality Monitor Backend
// Subscribes to MQTT, validates data, writes to Firebase, triggers alerts
// Also serves a REST API + WebSocket for the React dashboard

require("dotenv").config();
const mqtt      = require("mqtt");
const express   = require("express");
const cors      = require("cors");
const http      = require("http");
const WebSocket = require("ws");

const { initFirebase, saveSensorReading, saveAlert, trimHistory } = require("./firebase-service");
const { checkReading, THRESHOLDS } = require("./alert-engine");

// ─── Init Firebase ────────────────────────────────────────────
initFirebase();

setTimeout(async () => {
  console.log("🧪 TEST: Writing sample data to Firebase...");

  await saveSensorReading({
    ph: 7,
    turbidity: 1,
    do: 8,
    tds: 200
  });

  console.log("🧪 TEST: Write attempted");
}, 3000);

// ─── Express + HTTP + WebSocket ───────────────────────────────
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// In-memory store for REST endpoints
let latestReading = null;
const recentAlerts = [];
const MAX_ALERTS_IN_MEMORY = 100;

// Broadcast to all WebSocket clients
function broadcast(event, payload) {
  const msg = JSON.stringify({ event, payload, ts: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

// WebSocket connection
wss.on("connection", (ws) => {
  console.log("[WS] Client connected");
  // Send latest reading immediately on connect
  if (latestReading) ws.send(JSON.stringify({ event: "reading", payload: latestReading }));
  ws.on("close", () => console.log("[WS] Client disconnected"));
});

// ─── REST API ─────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.get("/api/latest", (req, res) => {
  if (!latestReading) return res.status(404).json({ error: "No data yet" });
  res.json(latestReading);
});

app.get("/api/alerts", (req, res) => {
  res.json(recentAlerts.slice(-50));
});

app.get("/api/thresholds", (req, res) => {
  res.json(THRESHOLDS);
});

// ─── MQTT Client ──────────────────────────────────────────────
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL || "mqtt://localhost:1883", {
  clientId: process.env.MQTT_CLIENT_ID || "water-quality-backend",
  clean: true,
  reconnectPeriod: 3000,
});

mqttClient.on("connect", () => {
  console.log("[MQTT] Connected to broker");
  mqttClient.subscribe("water/sensors/all", { qos: 1 }, (err) => {
    if (err) console.error("[MQTT] Subscribe error:", err);
    else console.log("[MQTT] Subscribed to water/sensors/all");
  });
  mqttClient.subscribe("water/device/status", { qos: 0 });
});

mqttClient.on("message", async (topic, message) => {
  const raw = message.toString();

  if (topic === "water/device/status") {
    console.log("[Device Status]", raw);
    broadcast("deviceStatus", JSON.parse(raw));
    return;
  }

  if (topic !== "water/sensors/all") return;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.warn("[MQTT] Bad JSON:", raw);
    return;
  }

  // Validate required fields
  const required = ["ph", "turbidity", "do", "tds"];
  if (!required.every(k => typeof data[k] === "number")) {
    console.warn("[MQTT] Missing sensor fields:", data);
    return;
  }

  console.log(`[Sensor] pH=${data.ph} | Turb=${data.turbidity} | DO=${data.do} | TDS=${data.tds}`);

  // Enrich with server timestamp
  data.receivedAt = new Date().toISOString();
  latestReading = data;

  // Broadcast live reading to dashboard
  broadcast("reading", data);

  // Check thresholds and generate alerts
  const violations = checkReading(data);
  if (violations.length > 0) {
    console.warn(`[Alert] ${violations.length} violation(s) detected`);
    for (const v of violations) {
      recentAlerts.unshift(v);
      if (recentAlerts.length > MAX_ALERTS_IN_MEMORY) recentAlerts.pop();
      broadcast("alert", v);
      await saveAlert(v);
    }
  }

  // Persist to Firebase
  console.log("🔥 Sending to Firebase:", data);
  await saveSensorReading(data);
});

mqttClient.on("error", (err) => console.error("[MQTT] Error:", err.message));
mqttClient.on("reconnect", ()  => console.log("[MQTT] Reconnecting..."));
mqttClient.on("offline",   ()  => console.log("[MQTT] Broker offline"));

// ─── Periodic history trim (every 10 min) ─────────────────────
setInterval(trimHistory, 10 * 60 * 1000);

// ─── Start server ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚰  Water Quality Backend running`);
  console.log(`   HTTP API  → http://localhost:${PORT}/api`);
  console.log(`   WebSocket → ws://localhost:${PORT}`);
  console.log(`   MQTT      → ${process.env.MQTT_BROKER_URL || "mqtt://localhost:1883"}\n`);
});
