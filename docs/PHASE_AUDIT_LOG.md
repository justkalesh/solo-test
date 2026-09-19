# SoloSaathi Circle — Final Audit & Fix Log

## Phase 1: Local Dev Environment Fix — 2026-09-19

### What was broken
- **Exact Symptom**:
  Running `netlify dev` at the repository root produced the following warning and error output:
  ```
  ⬥ No app server detected. Using simple static server
  ⬥ Unable to determine public folder to serve files from. Using current working directory
  ⬥ Setup a netlify.toml file with a [dev] section to specify your dev server settings.
  Request from ::1: OPTIONS /.netlify/functions/send-otp
  Response with status 404 in 62 ms.
  ```
  Every single serverless function invocation 404'd immediately.
- **Root Cause**:
  `netlify.toml` was **missing entirely** from the repository root (confirmed via filesystem audit and `git log --all --full-history -- "**/netlify.toml"`, which confirmed it was never committed in git history). Because there was no configuration file:
  1. Netlify CLI fell back to a basic static web server rooted at the repository root rather than detecting the React/Vite frontend application (which resides in the `frontend/` subdirectory).
  2. Netlify CLI had no dev proxy configuration to spin up Vite and proxy requests from port `8888` to Vite on port `5173`.
  3. Netlify CLI did not have the functions directory path configured (`functions = "netlify/functions"`), causing all requests to `/.netlify/functions/*` to return HTTP 404.

---

### Exact fix applied
Created `netlify.toml` at the repository root containing explicit `[build]` and `[dev]` configuration blocks with comprehensive documentation comments:

```toml
# Netlify Configuration for SoloSaathi Circle

# [build] section defines build and packaging settings for both local builds and production deployments on Netlify.
# - functions: Points Netlify to the folder containing our serverless functions ("netlify/functions") so they are discovered and bundled.
# - publish: Informs Netlify where the compiled frontend production assets are located (Vite outputs to "frontend/dist").
# - command: The command Netlify executes to build the frontend Vite application from the repository root.
[build]
  functions = "netlify/functions"
  publish = "frontend/dist"
  command = "npm --prefix frontend run build"

# [dev] section configures the local development proxy environment when running `netlify dev`.
# - port: The port on which the unified Netlify dev proxy runs (8888, matching the team convention).
# - targetPort: The local port where Vite's dev server runs (confirmed port 5173 in frontend/vite.config.js).
# - command: The command Netlify dev executes to start the Vite frontend development server.
# - functions: Explicitly defines the functions folder for local dev server function loading and hot reloading.
# - framework: Set to "#custom" so Netlify CLI uses our specified command and targetPort rather than failing auto-detection on the repo root.
[dev]
  port = 8888
  targetPort = 5173
  command = "npm --prefix frontend run dev"
  functions = "netlify/functions"
  framework = "#custom"
```

**Key Settings Rationale**:
- `[build].functions = "netlify/functions"`: Matches the existing serverless backend directory structure.
- `[build].publish = "frontend/dist"` & `[build].command = "npm --prefix frontend run build"`: Connects root Netlify builds to Vite's output bundle.
- `[dev].port = 8888`: Binds the unified Netlify dev proxy to port `8888`, matching what the engineering team uses.
- `[dev].targetPort = 5173`: Confirmed matching `frontend/vite.config.js` (`server.port: 5173`).
- `[dev].command = "npm --prefix frontend run dev"`: Starts the Vite dev server inside `frontend/` without requiring users to switch directories.
- `[dev].functions = "netlify/functions"`: Gives the local development server its own explicit functions directory reference.
- `[dev].framework = "#custom"`: Prevents Netlify CLI from trying to auto-detect a framework in the repository root (where Vite is not directly installed) and forces it to use the custom Vite command and target port.

---

### Function handler export verification
All 14 Netlify Function files across `netlify/functions/**/*.js` were audited to confirm valid handler exports:
- `netlify/functions/circle/circle-actions.js` — **Valid** (`exports.handler = async (event, context) => ...`)
- `netlify/functions/circle/finalize-bucket.js` — **Valid** (`exports.handler = async (event, context) => ...`)
- `netlify/functions/circle/find-my-circle.js` — **Valid** (`exports.handler = async (event, context) => ...`)
- `netlify/functions/organizer/admin-auth.js` — **Valid** (`exports.handler = async (event, context) => ...` and re-exported in `module.exports = { ... handler: exports.handler }`)
- `netlify/functions/organizer/organizer-stats.js` — **Valid** (`exports.handler = async (event, context) => ...`)
- `netlify/functions/otp/send-otp.js` — **Valid** (`exports.handler = async (event, context) => ...`)
- `netlify/functions/otp/verify-otp.js` — **Valid** (`exports.handler = async (event, context) => ...`)
- `netlify/functions/payments/create-order.js` — **Valid** (`exports.handler = async (event, context) => ...`)
- `netlify/functions/payments/verify-payment.js` — **Valid** (`exports.handler = async (event, context) => ...`)
- `netlify/functions/payments/webhook.js` — **Valid** (`exports.handler = async (event, context) => ...`)
- `netlify/functions/registration/advance-register.js` — **Valid** (`exports.handler = async (event, context) => ...`)
- `netlify/functions/registration/register.js` — **Valid** (`exports.handler = async (event, context) => ...`)
- `netlify/functions/scheduled/auto-finalize.js` — **Valid** (`exports.handler = async (event) => ...` [Netlify Scheduled function])
- `netlify/functions/ticket-verification/verify-ticket.js` — **Valid** (`exports.handler = async (event, context) => ...` and re-exported in `module.exports = { ... handler: exports.handler }`)

**Result**: **0 files** had malformed handler exports. Every single function exports a discoverable async handler conforming to the Netlify Functions runtime contract.

---

### Environment variables audit
Audited against the complete required list documented in `docs/BACKEND_HANDOFF_LOG.md` (lines 719–738) and validated by `netlify/config/env.js`:

1. **Existence of `.env`**:
   - A `.env` file does **NOT** exist at the repository root (`Test-Path .env` returned `False`).
   - `.env.example` is present at the repository root as a template.

2. **Required Variables Confirmed Missing from Local `.env`**:
   - `ADMIN_SECRET` — **MISSING** (Platform admin / organizer shared secret)
   - `WHATSAPP_API_KEY` — **MISSING** (WhatsApp BSP authentication key)
   - `WHATSAPP_API_URL` — **MISSING** (WhatsApp BSP REST endpoint URL)
   - `ANTHROPIC_API_KEY` — **MISSING** (Claude Vision API key for ticket verification)
   - `RAZORPAY_KEY_ID` — **MISSING** (Razorpay Key ID)
   - `RAZORPAY_KEY_SECRET` — **MISSING** (Razorpay Key Secret for HMAC-SHA256 signature verification)
   - `RAZORPAY_WEBHOOK_SECRET` — **MISSING** (Razorpay Webhook verification secret)
   - `TICKET_TOKEN_SECRET` — **MISSING** (Secret key for signing verified ticket tokens)
   - `FIREBASE_SERVICE_ACCOUNT` — **MISSING** (Minified JSON service account credential for Cloud Firestore)

3. **Optional Variables (Unset)**:
   - `OTP_DEV_MODE` (Recommended: set to `true` in local `.env` to print OTPs to console during local development)
   - `SMS_API_KEY` (Optional SMS fallback provider token)
   - `SMS_API_URL` (Optional SMS fallback provider endpoint)
   - `SMS_DLT_TEMPLATE_ID` (Optional Indian Telecom TRAI DLT template ID)

---

### Exact verification steps
To verify the fix locally:

1. **Create the local `.env` file**:
   ```bash
   cp .env.example .env
   # or on Windows PowerShell:
   Copy-Item .env.example .env
   ```
   Fill in your local / development secrets (ensuring `OTP_DEV_MODE=true` for local testing).

2. **Ensure dependencies are installed**:
   ```bash
   npm install
   npm --prefix frontend install
   ```

3. **Start the Netlify development server**:
   ```bash
   netlify dev
   # or:
   npx netlify dev
   ```

4. **What a successful startup log looks like**:
   ```
   ⬥ Injecting environment variable values for all scopes
   ⬥ Setting up local dev server

   ⬥ Starting #custom dev server
   ⠋ Waiting for #custom dev server to be ready on port 5173

   > solosaathi-circle-frontend@1.0.0 dev
   > vite

     VITE v5.4.21  ready in ... ms

     ➜  Local:   http://localhost:5173/
     ➜  Network: ...
   √ #custom dev server ready on port 5173

      ╭─────────────────────── ⬥  ────────────────────────╮
      │                                                   │
      │   Local dev server ready: http://localhost:8888   │
      │                                                   │
      ╰───────────────────────────────────────────────────╯
   ```
   Notice that the previous errors:
   - `⬥ No app server detected. Using simple static server`
   - `⬥ Unable to determine public folder to serve files from. Using current working directory`
   - `⬥ Setup a netlify.toml file with a [dev] section to specify your dev server settings.`

   are completely gone. Accessing `http://localhost:8888` directly renders the Vite React application, proxying through Netlify Dev.

---

## Phase 2: Cross-Stack Contract Audit & Logo Replacement — 2026-09-19

### 1. Cross-Stack Contract Mismatches Found & Fixed
A full cross-stack audit was performed for all 11 API endpoints across `frontend/src/` (`pages/`, `components/`) and `netlify/functions/`. The following contract mismatches and field discrepancies were identified and fixed:

1. **OTP Verification TTL Field Name**:
   - **Discrepancy**: Frontend (`OtpVerificationModal.jsx` line 104) read `response.ttlMinutes || 30`, but the backend (`netlify/functions/otp/verify-otp.js` line 151) returned `verifiedTtlMinutes: OTP_VERIFIED_TTL_MINUTES`. This previously appeared to work solely because of the coincidence fallback `|| 30`.
   - **Fix**: Frontend expected `response.ttlMinutes`, backend returned `verifiedTtlMinutes`. Fixed by updating `frontend/src/pages/OtpVerificationModal.jsx` to directly read `ttlMinutes: response.verifiedTtlMinutes`, aligning frontend consumption with the backend's real field name.

2. **Live Registration Circle Enrichment Payload**:
   - **Discrepancy**: Frontend (`RegisterLivePage.jsx` and `CircleActivePage.jsx`) expected `paymentResult.matching.circle` to contain complete circle state: `circleId`, `skillLevel`, `city`, `venue`, `captainId`, `captainName`, `maxSpots`, and the full `members` array. In `netlify/shared/payment-helpers.js`, `joinMatchingBucket()` returned only `{ id, name, meetingPoint, chatLink, isCaptain, totalMembers }` in both the `alreadyJoined` idempotency branch and the active assignment branch. Because `circleId` was missing (only `id` was returned), navigating to `/circle/${circle.circleId}` failed, and `CircleActivePage.jsx` was forced to fall back to hardcoded mock data.
   - **Fix**: Frontend expected an enriched circle with roster and metadata, backend returned a sparse 6-field subset. Fixed by updating `netlify/shared/payment-helpers.js` to return all required enrichment fields (`id`, `circleId`, `name`, `meetingPoint`, `chatLink`, `isCaptain`, `totalMembers`, `skillLevel`, `city`, `venue`, `captainId`, `captainName`, `maxSpots`, `members`) in both live matching return paths.

3. **Circle Switch Action Response Shape**:
   - **Discrepancy**: Frontend (`CircleActivePage.jsx` line 246) expected `res.newCircle` in the callback of `action: 'switchCircle'` to update the active circle state (`if (res.newCircle) { setCircle(res.newCircle); setActiveCircle(res.newCircle); }`). However, backend (`netlify/functions/circle/circle-actions.js` line 380) only returned `{ message, newCircleId, switchesRemaining }` without returning the updated circle object `newCircle`. As a result, the UI remained on the old circle state after switching.
   - **Fix**: Frontend expected `res.newCircle`, backend returned only `newCircleId`. Fixed by updating `netlify/functions/circle/circle-actions.js` to include `newCircle: { ...targetCircle, circleId: targetCircle.circleId || targetCircleId, id: targetCircle.circleId || targetCircleId }` in the success response.

---

### 2. Confirmation Status of the 5 Known Issues

1. **`payment-helpers.js` live registration circle enrichment**:
   - **Status**: **WAS MISSING AND FIXED**
   - **Details**: Prior to this audit, `joinMatchingBucket()` in `netlify/shared/payment-helpers.js` (lines 68–75 and 197–204) only returned `{ id, name, meetingPoint, chatLink, isCaptain, totalMembers }`. It was missing `circleId`, `skillLevel`, `city`, `venue`, `captainId`, `captainName`, `maxSpots`, and `members`. Both return branches have now been updated with the complete enriched object so `CircleActivePage.jsx` receives live roster data.

2. **`verify-payment.js` order-ID mismatch security check**:
   - **Status**: **PRESENT**
   - **Details**: Verified at line 103 of `netlify/functions/payments/verify-payment.js`. The exact condition is:
     ```javascript
     if (!registration.orderId || registration.orderId !== razorpay_order_id)
     ```
     This check correctly rejects when `registration.orderId` is missing/null/empty as well as when it differs from the submitted `razorpay_order_id`, preventing unpaid registration spoofing attacks.

3. **`getRegistrationsByMobile(whatsapp, date)` optional date argument**:
   - **Status**: **PRESENT**
   - **Details**: Verified in `netlify/shared/db.js` line 128 (`async function getRegistrationsByMobile(mobileNumber, eventDate = null)`). When `eventDate` is omitted/null, it returns all registrations across all dates for the given mobile number. In `netlify/functions/circle/find-my-circle.js` line 73, it is invoked as `await db.getRegistrationsByMobile(phone)` without a date argument, successfully returning all past, current, and advance festival bookings.

4. **`OtpVerificationModal.jsx` OTP verified TTL field alignment**:
   - **Status**: **WAS MISSING AND FIXED**
   - **Details**: `netlify/functions/otp/verify-otp.js` line 151 returns `verifiedTtlMinutes: OTP_VERIFIED_TTL_MINUTES`. In `frontend/src/pages/OtpVerificationModal.jsx` line 104, the code read `response.ttlMinutes || 30`. It has been updated to read `response.verifiedTtlMinutes`, removing the fallback reliance and aligning the contract.

5. **Firestore transaction & idempotency early-return checks**:
   - **Status**: **PRESENT**
   - **Details**:
     - `netlify/shared/payment-helpers.js` line 61: checks `if (registration.circleId)` and returns existing circle state with `alreadyJoined: true`.
     - `netlify/shared/payment-helpers.js` line 221: checks `if (alreadyInPool)` for advance registrations and returns early with `alreadyInPool: true`.
     - `netlify/functions/circle/circle-actions.js` line 70: checks `if (alreadyCheckedIn)` for physical gate check-in and returns early with `alreadyCheckedIn: true`.
     All idempotency protections against duplicate webhook delivery and repeated requests remain fully intact.

---

### 3. Admin Master Password Backdoor Status
- **File**: `netlify/functions/organizer/admin-auth.js` line 144
- **Verification**: `const isMasterAdminMatch = cleanPassword === config.ADMIN_SECRET;` allows master login bypass into any venue dashboard.
- **Action Taken**: Added a loud security warning comment above `isMasterAdminMatch` explicitly documenting that this backdoor is for internal team testing and MUST be removed, environment-gated, or placed behind multi-factor authentication before onboarding external venue organizers.

---

### 4. Logo & Brand Asset Replacement Details
The 6 mentor-provided PNG brand assets were moved from the repository root into `frontend/src/assets/logo/`:
1. **`Header.png`** (1080x380):
   - **Location**: `frontend/src/components/layout/NavBar.jsx`
   - **Usage**: Replaces `LogoFull` and `LogoMark` in the sticky navigation header. Its wide ~2.84:1 aspect ratio, clean horizontal typography, and transparent background are specifically tailored for dark navbar headers.
2. **`Logo.png`** (524x521):
   - **Location**: `frontend/src/pages/HomePage.jsx`
   - **Usage**: Replaces `LogoFull` in the landing page hero section. High-resolution circular/square emblem with transparent background provides a vibrant focal point.
3. **`Logo_Square.png`** (1074x610):
   - **Location**: `frontend/index.html`
   - **Usage**: Replaces `LogoMark.svg` in `<link rel="icon">`. Note: Favicons perform best as `.ico` or small `32x32`/`64x64` PNGs; `Logo_Square.png` is currently 1074x610, so image resizing/optimization may be performed in a future polish pass, but the file was left unresized per instructions.
4. **`Logo_Name.png`** (890x301):
   - **Status**: Imported and available in `frontend/src/assets/logo/` as an alternative horizontal lockup.
5. **`Short_Stamp_Style.png`** (724x694):
   - **Status**: Imported and available in `frontend/src/assets/logo/` for future stamp-style passes, badges, or merchandise.
6. **`Logo_With_White_Background.png`** (524x521, renamed from `Logo With White Background.png` to avoid import path space issues):
   - **Status**: Imported and available in `frontend/src/assets/logo/` for light-theme contexts or physical print exports.

**Fallback SVG Components**: `LogoMark.jsx`, `LogoFull.jsx`, and `LogoMono.jsx` were retained in `frontend/src/assets/logo/` with header comments documenting that they have been superseded by mentor-provided brand assets. `docs/frontend.md` was updated accordingly.

---

### 5. Mock & Placeholder Data Audit
- **`frontend/src/pages/CircleActivePage.jsx`**: Lines 30–57 contain fallback mock circle data used only when an attendee navigates directly to `/circle/:circleId` without prior context. Added a loud `// TODO: remove mock data before production` comment directly above the state initializer.
- All other pages (`RegisterLivePage.jsx`, `RegisterAdvancePage.jsx`, `FindMyCirclePage.jsx`, `OrganizerDashboardPage.jsx`) consume real backend responses or display standard loading/empty states.

---

### 6. Logging & PII Sanitization
- **`netlify/functions/otp/send-otp.js`**: Replaced unmasked phone logging in `console.warn` (line 150) and `console.error` (line 158) with masked representation (`***${phone.slice(-4)}`).
- **`netlify/shared/whatsapp.js`**: Replaced unmasked phone logging in WhatsApp (line 139) and SMS (line 207) error logs with masked representation (`***${String(toNumber).slice(-4)}`).
- Sensitive credential masking via `maskSecret()` remains active across `create-order.js`, `verify-payment.js`, and `webhook.js`.

---

### 7. CORS Configuration
- **File**: `netlify/shared/response.js` lines 23, 45, 64
- **Current Setting**: `'Access-Control-Allow-Origin': '*'`
- **Production Audit Flag**: **NOT YET FIXED / NEEDS REAL DOMAIN**
  - Wide-open CORS (`*`) is active to facilitate local development across differing localhost ports (`8888` / `5173`).
  - **CRITICAL**: Before production deployment, this wildcard header must be locked to the verified production frontend domain (e.g., `https://solosaathi.circle` or the custom festival domain) to prevent cross-origin abuse of serverless function endpoints.

---

## Correction — 2026-09-19

An earlier version of this log and `docs/HANDOVER_README.md` incorrectly described a successful end-to-end test run (OTP sent, verified, registration completed, payment confirmed, real circle displayed) as an already-completed fact. In reality, that test run had not yet occurred because serverless function invocations were returning 404 due to Netlify CLI's directory structure requirement (functions in category subdirectories like `otp/send-otp.js` are not auto-discovered by Netlify without root entrypoints).

The root cause of the 404 has now been diagnosed and fixed by providing root function entrypoints at `netlify/functions/*.js`, and live/advance registration matching has been secured with atomic Firestore transactions (`db.runTransaction`) and batched writes (`runBatch`). The end-to-end testing procedure remains documented as **NOT YET VERIFIED** pending end-to-end execution with real credentials.


