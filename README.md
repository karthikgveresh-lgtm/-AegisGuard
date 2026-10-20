# 🛡️ AegisGuard: Fast & Secure Online Transaction Authentication

A demo-ready, sub-millisecond fraud scoring and adaptive step-up authentication microservice built for real-time cloud environments.

AegisGuard evaluates silent device telemetry, behavioral biometric dynamics (keystrokes, mouse entropy, paste detection), geographic displacement velocities (impossible travel via Haversine), and transactional anomalies. It delivers deterministic **`ALLOW`**, **`CHALLENGE`**, or **`BLOCK`** decisions accompanied by **100% transparent, explainable risk factor weights**.

---

## Table of Contents

1. [Highlights](#highlights)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Quick Start](#quick-start)
5. [Project Structure](#project-structure)
6. [How the Risk Engine Works](#how-the-risk-engine-works)
7. [Scoring Weights](#scoring-weights)
8. [Explainability Payload](#explainability-payload)
9. [API Reference](#api-reference)
10. [The Two UIs](#the-two-uis)
11. [Demo Script for Judges](#demo-script-for-judges)
12. [Testing](#testing)
13. [Security Notes](#security-notes)
14. [Deploying to GCP Cloud Run](#deploying-to-gcp-cloud-run)
15. [Mapping to the Problem Statement](#mapping-to-the-problem-statement)
16. [Future Work](#future-work)

---

## Highlights

- **Three-tier decisions:** `ALLOW`, `CHALLENGE` (step-up TOTP), `BLOCK`.
- **Explainable by design:** every decision returns the signals behind it, with weights that add up to the score.
- **Multi-factor pipeline:** rule-based pre-filters plus a weighted scoring engine covering velocity, impossible travel, device consistency, behavioural deviation, and amount anomaly.
- **Rich client telemetry:** canvas and WebGL fingerprint, keystroke cadence, paste detection, mouse jitter, dwell time.
- **Live Risk Operations Console:** real-time stream over Server-Sent Events, metric cards, charts, and a drill-down inspector.
- **Zero setup:** no API keys, no external services. Geolocation and IP data come from a deterministic internal mock.
- **Cloud-ready:** stateless server, repository layer for swapping databases, Dockerfile for Cloud Run.

---

## Architecture

```
[ React + Vite Client ]
   ├── Tab 1: Merchant Checkout Simulator (telemetry collection, personas)
   └── Tab 2: Risk Operations Console (live stream, charts, inspector)
          │  POST telemetry + transaction            ▲ SSE (/api/stream)
          ▼                                          │
[ Node.js / Express API ]  ── helmet · cors · rate-limit · zod validation
   │
   ├── Stage 1: Rule-based pre-filters
   │      IP blacklist · hard velocity limit · severe geo jump
   │
   ├── Stage 2: Weighted scoring pipeline
   │      velocity · geo / impossible travel · device consistency
   │      behavioural deviation · amount anomaly
   │
   ├── Decision Engine ──► ALLOW | CHALLENGE (TOTP) | BLOCK
   │
   ├── Explainability Engine (signals, weights, summary)
   │
   └── Repository Layer ──► SQLite (swappable for PostgreSQL / MongoDB)
            ├── users / trusted_devices
            ├── transactions
            └── audit_log (append-only)
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js `v18+` or `v20+` (tested on Node `v24.11`)
- npm `v9+`

### 1. Installation
Install all root, client, and server dependencies in one command:
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Seed Database
Seeds 5 user profiles, trusted hardware devices, and ~200 historical transactions:
```bash
npm run seed
```

### 3. Run Automated Tests
Executes unit tests for Haversine, sliding window velocity, threshold boundaries (29/30/74/75), plus end-to-end Persona assertions:
```bash
npm test
```

### 4. Start Development Server
Starts both the Express API and Vite React client concurrently:
```bash
npm run dev
```

- **Frontend Client (Simulator & Ops Console):** [http://localhost:3000](http://localhost:3000)
- **Backend API Server:** [http://localhost:4000](http://localhost:4000)
- **Real-Time SSE Stream:** [http://localhost:4000/api/stream](http://localhost:4000/api/stream)

---

## 👨‍⚖️ Hackathon Judge Demo Script

Open [http://localhost:3000](http://localhost:3000) in your browser:

### Step 1: Persona A — Returning Customer (`Expected: ALLOW`)
1. Click the **"Persona A"** button at the top of the Checkout Simulator.
2. Notice the customer is **Alex Chen** using his **verified home MacBook Pro** from **New York**, with a typical grocery checkout of **$74.50**.
3. Click **"Authorize & Pay"**.
4. **Result:** Instant **`ALLOW`** screen in ~10–15ms.
5. Click **"Why this decision?"** to observe that the hardware matched his trusted device (`-5 pts`) and normal cadence kept the risk score at **0 / 100**.

### Step 2: Persona B — Suspicious VPN Hop (`Expected: CHALLENGE`)
1. Click **"Persona B"**.
2. Context: Alex Chen had an authorized transaction in New York 10 minutes ago. This new request originates from **Miami (~1,750 km away)** on an **unrecognized Windows device**.
3. Click **"Authorize & Pay"**.
4. **Result:** **`CHALLENGE`** step-up authentication modal appears (Risk Score: **60–68 / 100**).
5. Review the explainable signals:
   - `impossible_travel (+40)`: 1,750 km in 10 minutes represents an implied speed of **10,500 km/h**.
   - `unrecognized_device (+20)`: New browser fingerprint.
6. Look at the **"Hackathon Judge Demo Hint"** showing the active TOTP code. Click the code or enter `123456` into the 6 OTP input boxes.
7. Click **"Verify & Complete Payment"** &rarr; Notice it upgrades to **`CHALLENGE_PASSED`** and registers the device.

### Step 3: Persona C — Credential-Stuffing Bot (`Expected: BLOCK`)
1. Click **"Persona C"**.
2. Notice telemetry indicators: **Blacklisted botnet CIDR IP (`45.154.255.89`)**, **zero mouse jitter (`0.00`)**, **instant clipboard paste**, and superhuman **420ms form fill**.
3. Click **"Authorize & Pay"**.
4. **Result:** Immediate **`BLOCK`** screen (Risk Score: **100 / 100**).
5. Signals clearly highlight: `blacklisted_ip_or_subnet (+50)`, `clipboard_paste_sensitive_field (+25)`, `superhuman_form_fill_speed (+25)`, `zero_mouse_entropy (+20)`.

### Step 4: Live Risk Operations Console & Attack Simulation
1. Click the **"Risk Ops Console"** tab in the top navigation.
2. Observe live KPI metrics: Total Transactions, Approval Rate, Challenge Pass Rate, Block Rate, and Average Latency.
3. Review the interactive Recharts visualizations:
   - **Risk Score Distribution Histogram** (green 0–29, amber 30–74, red 75–100).
   - **Top Triggered Factors**.
   - **Decision Ratios**.
4. Click **"⚡ Run Attack Simulation"** in the header.
5. Watch the table and charts animate live via **Server-Sent Events** as a burst of 6 automated bot transactions are scored and rejected in real time.
6. Click any transaction row in the table to open the **Transaction Inspector Drawer** on the right, inspecting its factor contribution weights, raw hardware/behavioral telemetry, and append-only audit trail.

---

## ⚖️ Scoring Weights & Factor Ceilings

Configured in [`server/src/config/weights.js`](file:///server/src/config/weights.js):

| Category | Signal Factor | Weight | Condition / Evidence |
| :--- | :--- | :---: | :--- |
| **Pre-Filter** | `blacklisted_ip_or_subnet` | **+50** | IP matches threat intelligence / botnet subnet |
| **Pre-Filter** | `hard_rate_limit_violation` | **+60 / BLOCK** | Velocity >5 checkout attempts in 60 seconds |
| **Travel** | `impossible_travel` | **+40** | Implied displacement speed > 900 km/h |
| **Travel** | `rapid_displacement` | **+25** | Implied displacement speed 500 – 900 km/h |
| **Device** | `unrecognized_device` | **+20** | Unrecognized canvas/webgl browser hash |
| **Device** | `trusted_device` | **-5** | Verified hardware bound to user account |
| **Device** | `automated_browser_environment` | **+35** | Headless Chrome / Puppeteer / Selenium flags |
| **Behavior** | `clipboard_paste_sensitive_field` | **+25** | Direct paste into card number or CVV input |
| **Behavior** | `superhuman_form_fill_speed` | **+25** | Total form dwell time < 1,500 ms |
| **Behavior** | `robotic_keystroke_cadence` | **+25** | Inter-key interval std-dev < 15 ms |
| **Behavior** | `zero_mouse_entropy` | **+20** | Mouse movement curvature/jitter score &le; 0.05 |
| **Behavior** | `typing_cadence_anomaly` | **+10** | Cadence deviates >120ms from account baseline |
| **Transaction**| `severe_amount_anomaly` | **+30** | Amount z-score &ge; 3.0&sigma; above historical avg |
| **Transaction**| `high_amount_anomaly` | **+20** | Amount z-score &ge; 2.0&sigma; above historical avg |
| **Transaction**| `high_risk_merchant_category` | **+15** | Cryptocurrency, gift cards, luxury goods |

### Decision Thresholds
- **`0 – 29`** &rarr; **`ALLOW`** (Frictionless checkout)
- **`30 – 74`** &rarr; **`CHALLENGE`** (Step-up TOTP authentication required)
- **`75 – 100`** &rarr; **`BLOCK`** (Automated block; pre-filter violations override)

---

## 🔒 Security & PCI Compliance Hygiene

1. **Zero PAN/CVV Retention**: Sensitive Primary Account Numbers (PAN) and CVVs are **never logged or written to disk**. The server extracts only the non-sensitive `card_last4` and computes a one-way `SHA-256` token hash.
2. **Repository Abstraction**: All database calls are encapsulated in `/server/src/repositories/` (`userRepository.js`, `transactionRepository.js`, `auditRepository.js`), enabling seamless migration to PostgreSQL (Cloud SQL) or MongoDB.
3. **Immutable Audit Trail**: Evaluations, step-up attempts, and status escalations are recorded in an append-only `audit_log` table.
4. **Defense in Depth**: Express incorporates `helmet` HTTP security headers, CORS isolation, and `express-rate-limit`.

---

## 🚀 Deploying to Google Cloud Run

The server includes a containerized multi-stage [`Dockerfile`](file:///server/Dockerfile).

### 1. Build and push container to Google Artifact Registry:
```bash
# Set your GCP Project ID
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"

# Build image with Google Cloud Build
gcloud builds submit --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/fraud-service/server:v1 server/
```

### 2. Deploy to Cloud Run:
```bash
gcloud run deploy aegisguard-risk-engine \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/fraud-service/server:v1 \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1
```

For persistent production storage on GCP, replace SQLite by pointing `repositories/` to **Google Cloud SQL (PostgreSQL)** via Cloud SQL Auth Proxy or **Cloud Firestore / MongoDB Atlas**.
