// firebase-service.js — Firebase Realtime Database operations
const admin = require("firebase-admin");
require("dotenv").config();

let db = null;

function initFirebase() {
  if (admin.apps.length > 0) return; // already initialized

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    console.warn("[Firebase] FIREBASE_SERVICE_ACCOUNT_PATH not set — Firebase disabled");
    return;
  }

  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    db = admin.database();
    console.log("[Firebase] Connected to Realtime Database");
  } catch (err) {
    console.error("[Firebase] Init failed:", err.message);
  }
}

// ─── Save a sensor reading ─────────────────────────────────────
async function saveSensorReading(data) {
  if (!db) return;
  try {
    // Latest reading (overwritten each time)
    await db.ref("water/latest").set({
      ...data,
      serverTimestamp: admin.database.ServerValue.TIMESTAMP,
    });

    // Historical readings — pushed with auto-generated key
    await db.ref("water/history").push({
      ...data,
      serverTimestamp: admin.database.ServerValue.TIMESTAMP,
    });
  } catch (err) {
    console.error("[Firebase] Write error:", err.message);
  }
}

// ─── Save an alert record ─────────────────────────────────────
async function saveAlert(alert) {
  if (!db) return;
  try {
    await db.ref("water/alerts").push({
      ...alert,
      serverTimestamp: admin.database.ServerValue.TIMESTAMP,
    });
  } catch (err) {
    console.error("[Firebase] Alert write error:", err.message);
  }
}

// ─── Trim old history records (keep last 1000) ─────────────────
async function trimHistory() {
  if (!db) return;
  try {
    const snap = await db.ref("water/history").orderByKey().once("value");
    const keys = Object.keys(snap.val() || {});
    if (keys.length > 1000) {
      const toDelete = keys.slice(0, keys.length - 1000);
      const updates = {};
      toDelete.forEach(k => { updates[`water/history/${k}`] = null; });
      await db.ref().update(updates);
      console.log(`[Firebase] Trimmed ${toDelete.length} old records`);
    }
  } catch (err) {
    console.error("[Firebase] Trim error:", err.message);
  }
}

module.exports = { initFirebase, saveSensorReading, saveAlert, trimHistory };
