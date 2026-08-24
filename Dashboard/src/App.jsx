// src/App.jsx — Water Quality Monitor Dashboard
import React from "react";
import MetricCard  from "./components/MetricCard";
import AlertPanel  from "./components/AlertPanel";
import HistoryChart from "./components/HistoryChart";
import { useWaterSocket } from "./utils/useWaterSocket";

const STATUS_DOT = {
  connected:    { color: "#22c55e", label: "Live" },
  connecting:   { color: "#f59e0b", label: "Connecting..." },
  reconnecting: { color: "#f59e0b", label: "Reconnecting..." },
  error:        { color: "#ef4444", label: "Disconnected" },
};

export default function App() {
  const { status, latestReading, history, alerts, deviceOnline, dismissAlert } = useWaterSocket();
  const s = STATUS_DOT[status] || STATUS_DOT.error;

  const r = latestReading;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{
        background: "white",
        borderBottom: "1px solid #e5e7eb",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>💧</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>Water Quality Monitor</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>IoT Live Dashboard</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Device status */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: deviceOnline ? "#22c55e" : "#9ca3af",
              boxShadow: deviceOnline ? "0 0 0 3px #bbf7d0" : "none",
            }} />
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Device {deviceOnline ? "online" : "offline"}
            </span>
          </div>

          {/* WS status */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: s.color,
              boxShadow: status === "connected" ? `0 0 0 3px ${s.color}33` : "none",
            }} />
            <span style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</span>
          </div>

          {/* Alert badge */}
          {alerts.length > 0 && (
            <div style={{
              background: "#ef4444",
              color: "white",
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: 12,
              fontWeight: 700,
            }}>
              {alerts.length} Alert{alerts.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>

        {/* Last updated */}
        {r && (
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>
            Last update: {new Date(r.receivedAt || Date.now()).toLocaleString()}
            {r.deviceId ? ` · Device: ${r.deviceId}` : ""}
          </div>
        )}

        {/* Metric cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}>
          <MetricCard param="ph"        value={r?.ph} />
          <MetricCard param="turbidity" value={r?.turbidity} />
          <MetricCard param="do"        value={r?.do} />
          <MetricCard param="tds"       value={r?.tds} />
        </div>

        {/* Two-column: chart + alerts */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 20,
          alignItems: "start",
        }}>

          {/* History chart */}
          <div style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #e5e7eb",
          }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#111827" }}>
              Trend History
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
              Last {history.length} readings
            </p>
            <HistoryChart history={history} />
          </div>

          {/* Alert panel */}
          <div style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #e5e7eb",
          }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#111827" }}>
              Alert Panel
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>
              {alerts.length === 0 ? "No active alerts" : `${alerts.length} active alert(s)`}
            </p>
            <AlertPanel alerts={alerts} onDismiss={dismissAlert} />
          </div>
        </div>
      </main>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}
