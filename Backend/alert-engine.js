// alert-engine.js — Contamination detection and notification
const nodemailer = require("nodemailer");
require("dotenv").config();

// ─── Threshold config (from .env or defaults) ──────────────────
const THRESHOLDS = {
  ph:         { min: parseFloat(process.env.PH_MIN || 6.5),
                max: parseFloat(process.env.PH_MAX || 8.5) },
  turbidity:  { max: parseFloat(process.env.TURBIDITY_MAX || 4.0) }, // NTU (WHO guideline)
  do:         { min: parseFloat(process.env.DO_MIN || 6.0) },        // mg/L
  tds:        { max: parseFloat(process.env.TDS_MAX || 500) },       // ppm (WHO limit 500)
};

// ─── Email transporter ─────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ALERT_EMAIL_FROM,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Track recent alerts to avoid spam (1 alert per parameter per 5 min)
const alertCooldowns = {};
const COOLDOWN_MS = 5 * 60 * 1000;

// ─── Check a reading against thresholds ───────────────────────
function checkReading(data) {
  const violations = [];
  const now = Date.now();

  const checks = [
    {
      param: "ph",
      value: data.ph,
      violated: data.ph < THRESHOLDS.ph.min || data.ph > THRESHOLDS.ph.max,
      message: `pH ${data.ph} is outside safe range (${THRESHOLDS.ph.min}–${THRESHOLDS.ph.max})`,
      severity: data.ph < 5.0 || data.ph > 9.5 ? "critical" : "warning",
    },
    {
      param: "turbidity",
      value: data.turbidity,
      violated: data.turbidity > THRESHOLDS.turbidity.max,
      message: `Turbidity ${data.turbidity} NTU exceeds limit (${THRESHOLDS.turbidity.max} NTU)`,
      severity: data.turbidity > 10 ? "critical" : "warning",
    },
    {
      param: "do",
      value: data.do,
      violated: data.do < THRESHOLDS.do.min,
      message: `Dissolved Oxygen ${data.do} mg/L is below safe level (${THRESHOLDS.do.min} mg/L)`,
      severity: data.do < 3.0 ? "critical" : "warning",
    },
    {
      param: "tds",
      value: data.tds,
      violated: data.tds > THRESHOLDS.tds.max,
      message: `TDS ${data.tds} ppm exceeds limit (${THRESHOLDS.tds.max} ppm)`,
      severity: data.tds > 1000 ? "critical" : "warning",
    },
  ];

  for (const check of checks) {
    if (check.violated) {
      const cooldownKey = check.param;
      const lastAlert = alertCooldowns[cooldownKey] || 0;

      violations.push({
        parameter: check.param,
        value: check.value,
        message: check.message,
        severity: check.severity,
        timestamp: new Date().toISOString(),
        deviceId: data.deviceId || "unknown",
      });

      // Send email only if outside cooldown window
      if (now - lastAlert > COOLDOWN_MS) {
        alertCooldowns[cooldownKey] = now;
        sendAlertEmail(check, data).catch(console.error);
      }
    }
  }

  return violations;
}

// ─── Send alert email ─────────────────────────────────────────
async function sendAlertEmail(check, data) {
  if (!process.env.ALERT_EMAIL_FROM || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("[Alert] Email not configured — skipping email notification");
    return;
  }

  const severityEmoji = check.severity === "critical" ? "🚨" : "⚠️";
  const subject = `${severityEmoji} Water Quality Alert — ${check.param.toUpperCase()} ${check.severity.toUpperCase()}`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${check.severity === "critical" ? "#dc2626" : "#d97706"};
                  color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">${severityEmoji} Water Quality ${check.severity === "critical" ? "CRITICAL ALERT" : "WARNING"}</h2>
      </div>
      <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p><strong>Parameter:</strong> ${check.param.toUpperCase()}</p>
        <p><strong>Issue:</strong> ${check.message}</p>
        <p><strong>Device:</strong> ${data.deviceId || "unknown"}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
        <h3>Full Sensor Reading:</h3>
        <table style="border-collapse:collapse;width:100%">
          <tr style="background:#e5e7eb"><th style="padding:8px;text-align:left">Parameter</th><th style="padding:8px;text-align:left">Value</th></tr>
          <tr><td style="padding:8px;border-top:1px solid #e5e7eb">pH</td><td style="padding:8px;border-top:1px solid #e5e7eb">${data.ph}</td></tr>
          <tr><td style="padding:8px;border-top:1px solid #e5e7eb">Turbidity</td><td style="padding:8px;border-top:1px solid #e5e7eb">${data.turbidity} NTU</td></tr>
          <tr><td style="padding:8px;border-top:1px solid #e5e7eb">Dissolved Oxygen</td><td style="padding:8px;border-top:1px solid #e5e7eb">${data.do} mg/L</td></tr>
          <tr><td style="padding:8px;border-top:1px solid #e5e7eb">TDS</td><td style="padding:8px;border-top:1px solid #e5e7eb">${data.tds} ppm</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:16px">
          This is an automated alert from your Water Quality Monitoring System.
          Check your dashboard at http://localhost:3000 for live readings.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.ALERT_EMAIL_FROM,
    to: process.env.ALERT_EMAIL_TO,
    subject,
    html,
  });

  console.log(`[Alert] Email sent for ${check.param} ${check.severity}`);
}

module.exports = { checkReading, THRESHOLDS };
