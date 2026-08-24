# 💧 Water Quality Monitor — Setup Guide

A complete IoT water quality monitoring system with:
- **Arduino/ESP32** sensors (pH, Turbidity, DO, TDS)
- **Mosquitto** MQTT broker
- **Node.js** backend + Alert Engine
- **Firebase** Realtime Database
- **React** live dashboard

---

## 📁 Project Structure

```
water-quality-monitor/
├── arduino/
│   └── water_quality_sensor.ino     ← Upload to ESP32
├── mosquitto-config/
│   └── mosquitto.conf               ← Broker config
├── backend/
│   ├── index.js                     ← Main server
│   ├── alert-engine.js              ← Contamination detection
│   ├── firebase-service.js          ← Firebase writes
│   ├── simulate-sensor.js           ← Test without hardware
│   ├── package.json
│   └── .env.example                 ← Copy to .env
└── dashboard/
    ├── src/
    │   ├── App.jsx                  ← Main dashboard UI
    │   ├── firebase.js              ← Firebase client config
    │   ├── components/
    │   │   ├── MetricCard.jsx
    │   │   ├── AlertPanel.jsx
    │   │   └── HistoryChart.jsx
    │   └── utils/
    │       └── useWaterSocket.js    ← WebSocket hook
    └── package.json
```

---

## 🛠️ Prerequisites

Install these on your laptop before starting:

| Tool | Download |
|------|----------|
| Node.js v18+ | https://nodejs.org |
| Mosquitto MQTT Broker | https://mosquitto.org/download |
| Arduino IDE | https://www.arduino.cc/en/software |
| Git (optional) | https://git-scm.com |

---

## ⚙️ Step 1 — Install & Start Mosquitto

### Windows
```bash
# After installing Mosquitto, copy the config file:
copy mosquitto-config\mosquitto.conf "C:\Program Files\mosquitto\mosquitto.conf"

# Start the broker:
net start mosquitto
# OR
"C:\Program Files\mosquitto\mosquitto.exe" -c "C:\Program Files\mosquitto\mosquitto.conf" -v
```

### macOS
```bash
brew install mosquitto

# Copy config
cp mosquitto-config/mosquitto.conf /usr/local/etc/mosquitto/mosquitto.conf

# Start
brew services start mosquitto
# OR manually:
mosquitto -c /usr/local/etc/mosquitto/mosquitto.conf -v
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install mosquitto mosquitto-clients

# Copy config
sudo cp mosquitto-config/mosquitto.conf /etc/mosquitto/conf.d/water.conf

# Start
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

### ✅ Test Mosquitto is working
Open two terminals:
```bash
# Terminal 1 — subscribe
mosquitto_sub -h localhost -t "water/sensors/all"

# Terminal 2 — publish a test message
mosquitto_pub -h localhost -t "water/sensors/all" -m '{"ph":7.2,"turbidity":1.5,"do":8.1,"tds":220}'
```
You should see the JSON appear in Terminal 1.

---

## 🔥 Step 2 — Set Up Firebase

1. Go to https://console.firebase.google.com
2. Click **"Add project"** → name it (e.g. `water-monitor`)
3. **Disable** Google Analytics (not needed) → Create project

### Enable Realtime Database
1. Left sidebar → **Build → Realtime Database**
2. Click **"Create Database"**
3. Choose your region (pick closest to you — for India: `asia-southeast1`)
4. Start in **test mode** (for development)

### Get Service Account Key (for backend)
1. Project Settings (⚙️ gear icon) → **Service accounts**
2. Click **"Generate new private key"**
3. Download the JSON file
4. Rename it to `firebase-service-account.json`
5. Copy it into the `backend/` folder

### Get Web Config (for dashboard)
1. Project Settings → **Your apps** → click `</>` (Web)
2. Register app name (e.g. `water-dashboard`)
3. Copy the `firebaseConfig` object
4. Paste into `dashboard/src/firebase.js`

---

## 🖥️ Step 3 — Configure & Start the Backend

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env
```

Edit `.env` with your values:
```
MQTT_BROKER_URL=mqtt://localhost:1883
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FIREBASE_DATABASE_URL=https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com

# Optional: email alerts via Gmail
ALERT_EMAIL_FROM=your@gmail.com
ALERT_EMAIL_TO=alerts@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

PORT=3001
```

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App Passwords → Generate

```bash
# 3. Start the backend
npm start
```

You should see:
```
🚰  Water Quality Backend running
   HTTP API  → http://localhost:3001/api
   WebSocket → ws://localhost:3001
   MQTT      → mqtt://localhost:1883
```

---

## 🧪 Step 4 — Test Without Hardware (Simulator)

Before connecting real sensors, test the full stack:

```bash
# In a new terminal (backend must be running)
cd backend
node simulate-sensor.js
```

This publishes fake sensor readings every 5 seconds, with occasional contamination spikes (10% chance) to test alerts.

---

## ⚛️ Step 5 — Start the React Dashboard

```bash
cd dashboard

# 1. Install dependencies
npm install

# 2. Start dev server
npm start
```

Open http://localhost:3000 in your browser.

You should see:
- Live metric cards for pH, Turbidity, DO, TDS
- Real-time trend chart
- Alert panel (shows contamination warnings)

---

## 🔌 Step 6 — Flash the Arduino (Hardware)

### Required Libraries (install via Arduino Library Manager)
- `PubSubClient` by Nick O'Leary
- `ArduinoJson` by Benoit Blanchon
- `WiFi` (built-in for ESP32)

### Board Setup
1. Arduino IDE → **Tools → Board → ESP32 Arduino → ESP32 Dev Module**
2. Install ESP32 board package: File → Preferences → add `https://dl.espressif.com/dl/package_esp32_index.json`

### Configuration
Edit `arduino/water_quality_sensor.ino`:
```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_BROKER   = "192.168.1.100"; // ← Your laptop's IP address
```

### Find your laptop IP:
- Windows: `ipconfig` → IPv4 Address
- macOS/Linux: `ifconfig` or `ip addr`

### Pin Wiring
| Sensor | ESP32 Pin |
|--------|-----------|
| pH sensor analog out | GPIO 34 |
| Turbidity analog out | GPIO 35 |
| Dissolved Oxygen out | GPIO 32 |
| TDS sensor analog out | GPIO 33 |
| All sensors VCC | 3.3V or 5V (check datasheet) |
| All sensors GND | GND |

### Upload
1. Connect ESP32 via USB
2. Select correct COM port (Tools → Port)
3. Upload sketch
4. Open Serial Monitor (115200 baud) to see readings

---

## 🚀 Running Everything Together

Open **4 terminals** side by side:

```bash
# Terminal 1 — Mosquitto broker
mosquitto -c mosquitto-config/mosquitto.conf -v

# Terminal 2 — Backend
cd backend && npm start

# Terminal 3 — Simulator (or skip if using real hardware)
cd backend && node simulate-sensor.js

# Terminal 4 — Dashboard
cd dashboard && npm start
```

Then open: **http://localhost:3000**

---

## 🔍 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Backend health check |
| `GET /api/latest` | Latest sensor reading |
| `GET /api/alerts` | Recent alert history |
| `GET /api/thresholds` | Current safety thresholds |

---

## ⚠️ Alert Thresholds (WHO Guidelines)

| Parameter | Safe Range | Alert Condition |
|-----------|-----------|-----------------|
| pH | 6.5 – 8.5 | Outside range |
| Turbidity | < 4 NTU | Above 4 NTU |
| Dissolved Oxygen | > 6 mg/L | Below 6 mg/L |
| TDS | < 500 ppm | Above 500 ppm |

Modify in `backend/.env` to adjust thresholds.

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| `MQTT: Connection refused` | Check Mosquitto is running on port 1883 |
| `Firebase: Init failed` | Check service account JSON path in .env |
| Dashboard shows "Disconnected" | Check backend is running on port 3001 |
| ESP32 can't connect to MQTT | Check laptop IP, must be same WiFi network |
| No email alerts | Check Gmail App Password (not regular password) |
