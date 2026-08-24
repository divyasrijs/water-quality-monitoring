// simulate-sensor.js — Simulates Arduino sensor data for testing
// Run this when you don't have hardware connected yet
// Usage: node simulate-sensor.js

const mqtt = require("mqtt");

const client = mqtt.connect("mqtt://localhost:1883", {
  clientId: "simulator-001",
});

function randomInRange(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// Occasionally spike a value into contaminated range for testing alerts
function getReadings() {
  const spike = Math.random() < 0.1; // 10% chance of contamination event
  return {
    deviceId: "simulator-001",
    timestamp: Date.now(),
    ph:        spike ? randomInRange(4.0, 5.5)   : randomInRange(6.8, 7.8),
    turbidity: spike ? randomInRange(6.0, 15.0)  : randomInRange(0.5, 2.5),
    do:        spike ? randomInRange(1.0, 4.0)   : randomInRange(7.0, 10.0),
    tds:       spike ? randomInRange(600, 1200)  : randomInRange(150, 400),
  };
}

client.on("connect", () => {
  console.log("🔌 Simulator connected to MQTT broker");
  console.log("   Publishing to water/sensors/all every 5s\n");

  setInterval(() => {
    const data = getReadings();
    client.publish("water/sensors/all", JSON.stringify(data), { qos: 1 });
    const isSpike = data.ph < 6.5 || data.turbidity > 4;
    console.log(
      `[SIM] pH=${data.ph} | Turb=${data.turbidity} | DO=${data.do} | TDS=${data.tds}` +
      (isSpike ? "  ⚠️  CONTAMINATION SPIKE" : "")
    );
  }, 5000);
});

client.on("error", (err) => console.error("Simulator error:", err.message));
