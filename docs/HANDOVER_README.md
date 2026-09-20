# SoloSaathi Circle — Handover Document

## What this project is
**SoloSaathi Circle** is a production-grade, real-time festival companion web application built for Navratri festival nights across Gujarat and major Indian cultural hubs. Built by Kritz Vyonera AI Studio to deliver on the emotional promise *"You came to dance. Not to stand alone,"* it matches solo festival attendees into balanced, cohesive groups of 8 to 24 dancers called **Circles** — complete with volunteer Circle Captains, designated landmark meeting anchors, a pulsing in-app color beacon, ephemeral group chat, and organizer operations tools.

---

## Current status

### What works and is fully wired locally
- **Local Dev Server Integration (Fixed in Consolidated Pass)**: Netlify Function entrypoint shims were added directly in `netlify/functions/*.js` to resolve Netlify CLI's directory discovery limitation (functions in subdirectories like `otp/send-otp.js` are not auto-discovered by Netlify without root entrypoints). Functions now proxy without 404.
- **Frontend-Backend Contract Alignment**: All 11 serverless API routes have undergone full contract audit. Request payloads and response shapes are strictly aligned across all registration, payment, circle action, and organizer endpoints.
- **Live Circle Data Enrichment**: Live registration and payment verification returns an enriched circle object (`circleId`, `skillLevel`, `city`, `venue`, `captainId`, `captainName`, `maxSpots`, `members`) ensuring `CircleActivePage.jsx` renders live roster data rather than fallback mock profiles.
- **Brand Asset Integration**: 6 mentor-provided PNG brand assets (`Header.png`, `Logo.png`, `Logo_Square.png`, `Logo_Name.png`, `Short_Stamp_Style.png`, `Logo_With_White_Background.png`) are located in `frontend/src/assets/logo/` and rendered in the navigation header, homepage hero, and browser favicon. Legacy SVG components remain preserved as fallbacks with deprecation notices.
- **Production Build Validation**: `npm --prefix frontend run build` compiles cleanly with zero syntax errors, zero missing imports, and zero TypeScript/bundling issues.
- **PII Logging Sanitization**: Attendee phone numbers in WhatsApp and SMS failure logs are masked (`***XXXX`).

### What does NOT work yet or requires external setup
- **Production Deployment**: The application has **NOT** been deployed to production yet. All verifications to date reflect local development state.
- **End-to-End Manual Test Verification**: **NOT YET VERIFIED**. The manual test run documented below has not yet been executed end-to-end with active credentials.
- **Real SMS / WhatsApp Delivery in Production**: Outbound OTP messages require active third-party credentials (`WHATSAPP_API_KEY` with a verified Meta BSP, or TRAI DLT-approved template IDs for Indian SMS gateways). In local development, `OTP_DEV_MODE=true` simulates dispatches by printing 6-digit OTP codes directly to the terminal console.
- **Live Razorpay Payments**: Order creation and payment signature verification require live Razorpay keys (`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`). In local dev, test-mode keys (`rzp_test_...`) or mocked order responses must be used.
- **Cloud Firestore Database**: Requires a Firebase Service Account JSON string in `FIREBASE_SERVICE_ACCOUNT` for live cloud persistence across function instances.

---

## How to run this locally (step by step, exact commands)

### 1. Prerequisites
- **Node.js**: v18.x or higher (Node v24.x tested and verified).
- **npm**: v9.x or higher.
- **Netlify CLI**: Installed globally (`npm install -g netlify-cli`) or executed via `npx netlify`.

### 2. Initial Setup
Clone the repository and install all root and frontend dependencies:

```bash
# 1. Install root dependencies (firebase-admin, razorpay)
npm install

# 2. Install frontend dependencies (react, react-dom, react-router-dom, vite)
npm --prefix frontend install
```

### 3. Configure Local Environment Variables
Create a local `.env` file at the repository root by copying `.env.example`:

```bash
# On Linux / macOS / Git Bash:
cp .env.example .env

# On Windows PowerShell:
Copy-Item .env.example .env
```

Open `.env` in your editor and configure the minimum required settings for local testing:

```ini
# Enable simulated WhatsApp/SMS OTP dispatches to terminal console
OTP_DEV_MODE=true

# Platform shared admin secret (used for master organizer login & cron finalization)
ADMIN_SECRET=solosaathi_local_dev_secret_2026

# Cryptographic token signing secrets (any 32+ character random string for local dev)
TICKET_TOKEN_SECRET=dev_ticket_secret_must_be_at_least_32_chars_long!!

# Razorpay credentials (use free test keys from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_test_placeholder
RAZORPAY_KEY_SECRET=rzp_secret_placeholder
RAZORPAY_WEBHOOK_SECRET=rzp_webhook_secret_placeholder

# Anthropic Claude Vision API Key (optional for ticket OCR testing)
ANTHROPIC_API_KEY=sk-ant-placeholder

# Firebase Service Account (minified JSON string of your Firebase service account credentials)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}
```

### 4. Start the Development Server
Run the unified Netlify Dev proxy from the repository root:

```bash
npx netlify dev
```

When ready, Netlify Dev displays:
```
   Local dev server ready: http://localhost:8888
```
Open `http://localhost:8888` in your browser.

---

## End-to-End Manual Verification Run-Through (NOT YET VERIFIED)

> **STATUS: NOT YET VERIFIED**
> The following step-by-step test procedure is documented and ready to execute, but has **NOT YET BEEN VERIFIED** end-to-end with live credentials. An earlier version of this document incorrectly described this test sequence as completed; this has been corrected.

Follow this exact sequence to test each feature in order:

### Step 1: OTP Dispatch (`send-otp`)
1. Navigate to `http://localhost:8888/register`.
2. Enter your 10-digit Indian WhatsApp number (e.g. `9876543210`).
3. Click **"Send Verification Code"**.
4. Check your Netlify Dev terminal console. With `OTP_DEV_MODE=true`, you will see:
   ```
   [DEV MODE - WhatsApp Simulated] To: 9876543210 | Template: otp_verification | Params: [ '123456' ]
   ```

### Step 2: OTP Verification (`verify-otp`)
1. In the modal on screen, enter the 6-digit code shown in your terminal.
2. Click **"Verify & Continue"**.
3. The modal will close, displaying a green **"✓ Verified"** badge. The backend persists a 30-minute verified session.

### Step 3: Live Registration (`register`)
1. Fill in attendee preferences:
   - **City**: Ahmedabad (or Surat / Vadodara)
   - **Venue**: United Way Garba Grounds
   - **Rhythm / Skill Level**: Intermediate (or Beginner / Pro Raas)
   - **Gender**: Female / Male
   - **Age Band**: 18–25
   - **Captain Opt-in**: Check if you want to test captain assignment.
2. In the Ticket step, select **"Enter Serial Number"** and type `PASS-TEST-2026` (or upload an image to test OCR if Anthropic key is set).
3. Click **"Continue to Payment"**.
4. The draft registration is created in the database and advances to the payment step.

### Step 4 & 5: Payment Order & Verification (`create-order` & `verify-payment`)
- **With Real Razorpay Test Keys** (`rzp_test_...`):
  1. Click **"Pay ₹199 to Enter Circle"**.
  2. The secure Razorpay Checkout popup will open.
  3. Select Test Mode (Netbanking or UPI: `success@razorpay`).
  4. Upon successful test payment, Razorpay invokes the handler callback, which posts `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to `/verify-payment`.
  5. The backend validates the HMAC-SHA256 signature, confirms registration, and triggers `joinMatchingBucket()`.
- **Without Razorpay Keys (Placeholder / Offline)**:
  - If you only have placeholder keys locally, the Razorpay modal will report an invalid key error. To test the matching engine directly, you can invoke `/verify-payment` via an authenticated curl/script or use a free Razorpay test account from [dashboard.razorpay.com](https://dashboard.razorpay.com).

### Step 6: Active Circle Roster (`CircleActivePage.jsx`)
1. Once confirmed, you are redirected to `/circle/:circleId` (e.g. `/circle/ahmedabad-united-way-intermediate-mixed-1`).
2. Verify the page displays **real circle data**:
   - Circle name and landmark meeting anchor (`Near Main Festival Entrance / Information Desk`).
   - The member roster includes your name, your assigned captain, and active member spots.
   - Click **"Flash Color Beacon"** to test the full-screen GPU-animated color flasher (`BeaconPulse.jsx`).
   - Click **"I'm at the Gate"** to record physical attendance check-in (`action: 'showup'`).

### Step 7: Ephemeral Circle Chat (`CircleChatPage.jsx`)
1. Click **"Open Circle Chat"** (routes to `/circle/:circleId/chat`).
2. Test sending a message or clicking one of the preset quick chips (`"📍 At the meeting anchor!"`).
3. Verify the **1:00 AM IST Auto-Close Countdown** is active and the **"🚨 Security SOS"** hotline button is present.

### Step 8: Pass & Circle Lookup (`find-my-circle`)
1. In the navigation bar, click **"Find Circle"** (or open `http://localhost:8888/find-circle`).
2. Enter the WhatsApp number used in Step 1.
3. Click **"Find My Active Pass"**.
4. Verify your active festival pass appears with today's circle badge, landmark meeting point, and digital entry pass token.

### Step 9: Organizer Operations Portal (`admin-auth` & `organizer-stats`)
1. Navigate to `http://localhost:8888/organizer/login`.
2. Enter:
   - **Venue ID**: `united-way-garba-grounds`
   - **Password**: Your `ADMIN_SECRET` (e.g. `solosaathi_local_dev_secret_2026`).
3. Click **"Authenticate Venue Terminal"**.
4. Verify redirection to `http://localhost:8888/organizer/dashboard`.
5. Verify aggregate metrics load: Total Attendee Check-Ins, Live Walk-in vs Advance Splits, Skill Level Breakdown, and Circles Formed — with zero PII (no names, phone numbers, or revenue).

---

## What still needs to happen before going live

The following items are required before deploying to production:

### 1. Production Environment Variables (Netlify Dashboard)
Set the following environment variables in the Netlify site settings (**Site configuration → Environment variables**):

| Variable | Required | Description |
| :--- | :---: | :--- |
| `ADMIN_SECRET` | **YES** | Strong random secret for platform admin access and scheduled cron invocation. |
| `WHATSAPP_API_KEY` | **YES** | Production API key from your Meta WhatsApp Business Solution Provider (BSP). |
| `WHATSAPP_API_URL` | **YES** | Full REST endpoint URL for outbound WhatsApp message dispatch. |
| `ANTHROPIC_API_KEY` | **YES** | Anthropic API key (`sk-ant-...`) with Claude 3.5 Sonnet access for ticket OCR. |
| `RAZORPAY_KEY_ID` | **YES** | Production Razorpay Key ID (`rzp_live_...`). |
| `RAZORPAY_KEY_SECRET` | **YES** | Production Razorpay Key Secret for cryptographic HMAC-SHA256 signature verification. |
| `RAZORPAY_WEBHOOK_SECRET` | **YES** | Secret configured in the Razorpay Webhook dashboard for `payment.captured` events. |
| `TICKET_TOKEN_SECRET` | **YES** | 32+ character secret for cryptographically signing verified ticket tokens (`ticketVerifiedToken`). |
| `FIREBASE_SERVICE_ACCOUNT` | **YES** | Minified JSON string of your Firebase Service Account private key with Firestore Admin privileges. |
| `OTP_DEV_MODE` | **NO** | Must be `false` (or unset) in production to ensure real message dispatch. |
| `SMS_API_KEY` | Optional | API token for Indian SMS gateway fallback. |
| `SMS_API_URL` | Optional | REST endpoint URL for outbound SMS dispatch. |
| `SMS_DLT_TEMPLATE_ID` | Optional | Approved Indian Telecom TRAI DLT template ID for transactional OTP SMS. |

### 2. Lock Down CORS to Production Domain
In `netlify/shared/response.js`:
- Currently, `'Access-Control-Allow-Origin': '*'` is used to facilitate local multi-port development.
- Before launching, replace `'*'` with the real production domain:
  ```javascript
  'Access-Control-Allow-Origin': 'https://your-production-domain.com'
  ```

### 3. Organizer Authentication Upgrade
- `admin-auth.js` currently derives venue passwords using a deterministic HMAC formula (`deriveMockVenuePassword`) and contains an `ADMIN_SECRET` master bypass backdoor.
- Before onboarding external commercial venue organizers, replace this with a dedicated `organizers` collection in Firestore storing salted bcrypt password hashes, and remove or environment-gate the master password check.

### 4. Firestore Composite Indexes & TTL Policies (Firebase Console)
Configure the following in the Firebase Console:
1. **Composite Index**:
   - Collection: `registrations`
   - Fields: `whatsapp` (Ascending) + `eventDate` (Ascending)
   - Scope: Collection
2. **TTL (Time-To-Live) Policies**:
   - Collection: `otp` on field `expiresAt` (auto-delete expired verification codes).
   - Collection: `verified` on field `verifiedAt` (auto-delete expired 30-minute verified sessions).

### 5. Finalize Navratri Peak Pricing Dates
In `netlify/shared/pricing.js`:
- Update `PEAK_DATES` to match the exact weekend and final-night dates of the active festival season (standard nights charge ₹199; peak nights charge ₹249).

### 6. SMS DLT Template Approvals
- If outbound SMS fallback is used alongside WhatsApp, complete the Indian Telecom TRAI DLT registration and obtain carrier-approved template headers before festival opening night.

---

## Where to find more detail

- **Backend Architecture & Serverless Specifications**: [`docs/BACKEND_HANDOFF_LOG.md`](file:///c:/Users/Pratik/Solo-Saathi-Cirlce/docs/BACKEND_HANDOFF_LOG.md)
- **Frontend Architecture & Design Tokens**: [`docs/frontend.md`](file:///c:/Users/Pratik/Solo-Saathi-Cirlce/docs/frontend.md)
- **Database Architecture & Firestore Schemas**: [`docs/database.md`](file:///c:/Users/Pratik/Solo-Saathi-Cirlce/docs/database.md)
- **Audit Logs & Fix History (Phase 1 & Phase 2)**: [`docs/PHASE_AUDIT_LOG.md`](file:///c:/Users/Pratik/Solo-Saathi-Cirlce/docs/PHASE_AUDIT_LOG.md)

---

## Who built what (for context, not blame)

- **Backend Architecture & Serverless Functions**: Built by the Backend Team (`netlify/functions/**/*.js`, covering OTP authentication, Anthropic Claude Vision ticket verification, Razorpay order/webhook lifecycle, circle matching engine, live circle chat, and organizer operations).
- **Database Architecture & Firestore Schema**: Initialized by the Database Teammate (`netlify/shared/db.js`, implementing all 18 Firebase Admin SDK Firestore methods and data contracts across registrations, pools, circles, group partitions, OTP records, and gate showups).
- **Frontend Foundation, UI System & Full Application**: Built by the Frontend Team (`frontend/src/`, establishing design tokens in `theme.js`, responsive layout in `AppShell.jsx`, code-split routes in `router.jsx`, all 10 page views, and festive UI components).
- **Cross-Stack Audit, Dev Server & Asset Integration**: Completed in Phase 1 & 2 audit passes (configured `netlify.toml`, aligned API contracts, enriched live circle rosters, migrated mentor PNG brand assets, sanitized logs, and produced audit documentation).
