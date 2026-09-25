# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SoloSaathi Circle matches solo Navratri/Garba attendees into gender-balanced, skill-grouped "Circles" (8–24 people) with volunteer Captains. It has two parts: a React/Vite SPA in `frontend/` and a Netlify Functions (Node, CommonJS) backend in `netlify/`. Data lives in Firebase Firestore. Payments go through Razorpay, ticket OCR through Google Gemini, and OTP delivery through a WhatsApp BSP with SMS fallback. It has not been deployed to production yet.

## Commands

Run everything from the repo root:

```bash
npm install && npm --prefix frontend install   # both package.json files
npx netlify dev                                 # full stack on http://localhost:8888 (proxies Vite :5173 + functions)
npm run frontend                                # Vite only on :5173 (API calls still go to :8888)
npm run build:frontend                          # production build -> frontend/dist
```

- There is no test suite, linter, formatter, or TypeScript. `npm test` is a placeholder that exits 1. Use `npm run build:frontend` as the frontend correctness check.
- Local env: copy `.env.example` to `.env` at the root. Frontend overrides go in `frontend/.env.local` (`VITE_API_BASE_URL`).
- Set `OTP_DEV_MODE=true` locally so OTP codes print to the `netlify dev` console instead of being sent.

## Backend architecture (`netlify/`)

**Function discovery via shims.** The real handlers live in category folders (`otp/`, `registration/`, `payments/`, `circle/`, `organizer/`, `ticket-verification/`, `scheduled/`). Netlify only discovers top-level files, so each endpoint also needs a one-line shim at `netlify/functions/<name>.js` (`module.exports = require('./<category>/<name>')`). The shim filename is the public route (`/.netlify/functions/<name>`). When you add a function, add its shim too. `scheduled/cleanup-expired.js` currently has no shim.

**Shared modules (`netlify/shared/`).** Handlers should go through these rather than reimplementing them:
- `response.js`: every response uses the envelope `{ success: true, data }` / `{ success: false, error, details }` via `successResponse` / `errorResponse`. Handlers start with `if (event.httpMethod === 'OPTIONS') return handleOptions();`. CORS is `*` (flagged to lock down before launch).
- `constants.js`: all business rules live here: gender cap, group sizes, OTP limits, switch-circle limits, IST live window, circle name prefixes. The wording of `CHAT_CLOSE_MESSAGE` must not be changed.
- `db.js`: the only Firestore access layer (18 get/save functions plus `runTransaction`, `runBatch`, `getDocRef`, `FieldValue`, and the doc-ID builders). Partitioned docs (`pools`, `groupstate`, `showups`) use slugified composite IDs like `{city}_{venue}_{level}_{genderPref}_{date}`. If `FIREBASE_SERVICE_ACCOUNT` is missing, `db` is `null` and calls throw.
- `matching.js`: pure matching and time logic (`buildCircleId`, `checkGenderCap`, `shouldStartNewBucket`, `getIstTime`, `isLiveRegistrationOpen`, `isAdvanceRegistrationOpen`).
- `payment-helpers.js`: `joinMatchingBucket()` is the single, idempotent entry point that puts a paid attendee into a circle or pool.
- `pricing.js`: `PEAK_DATES` gives ₹199 standard or ₹249 peak pricing. The price is always computed server-side. `frontend/src/pages/RegisterAdvancePage.jsx` has its own copy of `PEAK_DATES` for display, so keep the two in sync.
- `netlify/config/env.js`: centralized env access that fails fast at cold start if any required var is missing (all except `OTP_DEV_MODE` and `SMS_*`). Most functions import it transitively (for example through `whatsapp.js` or `verify-ticket.js`), so locally every required var needs at least a placeholder value.

**Payment-gated registration flow.** Nobody is placed in a circle or pool until payment is verified:
1. `send-otp` / `verify-otp` create a 30-minute verified session keyed by WhatsApp number.
2. `register` (live) or `advance-register` saves a draft registration (`paymentStatus: 'pending'`, `circleId: null`) and returns `nextStep: create_order`.
3. `create-order` creates the Razorpay order and stores `orderId` on the registration.
4. `verify-payment` (client HMAC check, which also requires the stored `orderId` to match) or `webhook` (raw-body HMAC) confirms payment. Either one then calls `joinMatchingBucket()`.
   - Live: instant assignment inside a Firestore transaction across `groupstate`, `circles`, and `registrations`.
   - Advance: appended to `pools`. `scheduled/auto-finalize` (hourly) or the admin-only `circle/finalize-bucket` forms circles up to 48h before the event.

Keep multi-document read-modify-write changes inside `runTransaction` or `runBatch`. See `docs/database.md` §3 for which operations use which.

**Time windows (IST).** Live registration only accepts requests on or after `LIVE_SEASON_START_DATE` (2026-10-13), between 18:30 and 01:30 IST. After midnight, requests count toward the previous night. There is no dev bypass, so outside that window live `/register` rejects by design. Advance registration closes at 17:30 IST on the event date.

**Other endpoints.** `circle-actions` takes a single `action` field (`grow`, `lock`, `leave`, `transferCaptain`, `showup`, `switchCircle`). `find-my-circle` looks up every registration for a phone number and sorts it into live, upcoming, or past. `admin-auth` issues 12-hour organizer tokens; it contains an `ADMIN_SECRET` master-password bypass that is flagged for removal. `organizer-stats` returns aggregates only, with no names, phone numbers, or revenue.

Log phone numbers masked (`***${phone.slice(-4)}`) and secrets via `maskSecret()`.

## Frontend architecture (`frontend/src/`)

- **API:** always call through `api/apiClient.js` (`apiPost`, `apiGet`, `postRequest`, …) with the shim name as the path (`apiPost('/send-otp', …)`). It unwraps the `data` envelope and throws `ApiError(message, status, details)`. The base URL comes from `VITE_API_BASE_URL`, else `http://localhost:8888/.netlify/functions` on localhost, else relative `/.netlify/functions`.
- **Styling:** there is no CSS framework. Components use inline `style={{…}}` objects built from theme tokens. Call `const theme = useTheme()` inside the component body (never at module scope, and never as a default parameter) and read from `theme.colors`, `theme.gradients`, `theme.fonts`, and so on. `styles/theme.js` exports frozen `lightTheme` and `darkTheme`, with light as the default. The toggle lives in `ThemeContext` (`useThemeMode`) and is persisted in `localStorage` under `solosaathi_theme`. Don't hardcode hex colors, because they break theme switching.
- **Mobile layout rules** (each one fixed a real bug):
  - Give page root containers `width: '100%'` along with `maxWidth` and `margin: '0 auto'`. `<main>` is a flex column, so without it the page shrinks to its content's width and overflows on phones.
  - Render full-screen overlays (modals, `BeaconPulse`) through `components/common/Portal.jsx`. `<main>` has its own stacking context, so an in-place `position: fixed` overlay renders below the sticky NavBar and BottomNav.
  - `AppShell` reserves space for `BottomNav`, so pages don't need extra bottom padding for it.
  - `globalStyles.js` forces form fields to 16px on phones to prevent iOS focus-zoom.
- **Routing:** `router.jsx` lazy-loads every page inside `AppShell` (NavBar, desktop Footer, mobile `BottomNav`). Pages include the multi-step pieces `OtpVerificationModal`, `TicketUploadStep`, and `PaymentStep`, which live in `pages/` but are embedded in the register flows, not routed.
- **State:** `AppContext` holds the user (persisted to `localStorage`), selected city and venue, notifications, and the active circle. Organizer tokens go in `sessionStorage` only.
- **Icons:** `lucide-react`. Brand PNGs are in `assets/logo/`. The SVG logo components there are deprecated fallbacks.
- **Skill levels:** the display data (label, icon, tag, desc, colors) lives in `theme.levels`. For level-colored text use `level.textColor`, not `level.color`: the bright accent is unreadable on light-mode backgrounds.
- **Text on special surfaces:** use `theme.colors.textDanger` for error text, and `textOnDark` / `textOnDarkMuted` on surfaces that stay dark in both themes (for example `gradients.ctaCard` and the Beacon panels). For fills, use `surfaceElevated` rather than dark `rgba(...)` values, which turn into grey slabs in light mode.
- `CircleActivePage.jsx` gets its circle only from `AppContext.activeCircle`, which isn't persisted. After a page reload it shows "No Active Circle Found".

## Docs

`docs/` holds detailed handoff logs: `BACKEND_HANDOFF_LOG.md` (db contract shapes, env vars, payment security), `database.md` (Firestore collections and transactions), `frontend.md` (design tokens, the endpoint-to-caller table), `PHASE_AUDIT_LOG.md` (contract fixes), and `HANDOVER_README.md` (manual E2E test script and pre-launch checklist). Some early sections describe superseded designs (Netlify Blobs, Claude Vision, unwrapped writes), so check them against the code. When changing a request or response shape, update both the function and its frontend caller, since the audit log records past mismatches between them.
