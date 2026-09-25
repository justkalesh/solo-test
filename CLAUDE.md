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
npm test                                        # node --test: tests/*.test.js (backend) + tests/*.test.mjs (demo backend)
npm run frontend:mock                           # Vite with every request answered by the demo backend
npm run create-organizer -- AH-UNIT Ahmedabad "United Way Garba Grounds"   # organizer account (needs .env)
```

- There is no linter, formatter, or TypeScript. Run `npm test` and `npm run build:frontend` as the correctness checks. Backend handler tests use an in-memory db injected through `require.cache` (`tests/helpers/fake-db.js`); no Firebase needed.
- Local env: copy `.env.example` to `.env` at the root. Frontend overrides go in `frontend/.env.local` (`VITE_API_BASE_URL`, `VITE_SOS_WHATSAPP`).
- Set `OTP_DEV_MODE=true` locally so OTP codes print to the `netlify dev` console instead of being sent.

## Demo mode (test accounts on every build)

`frontend/src/api/mockApi.js` is an in-browser copy of the backend, shipped as a lazy chunk in every build (local, preview, production). `api/mockMode.js` routes a request there when it uses test details, so the whole flow can be demoed without keys; everything else goes to the real functions:

| Use | Details |
|---|---|
| New signups | any WhatsApp number 9000000001–9000000999, OTP `123456` |
| Existing bookings | 9000000000, OTP `123456`: a live circle tonight (captain Aarav), an upcoming advance booking, last night's circle |
| Organizer | venue ID `DEMO-UNIT`, password `demo1234` |
| Payments | a fake checkout (success, failure, tampered signature) for orders with key `rzp_test_mock` |

Routing: phone-bearing endpoints by test number; `create-order` / `verify-payment` by the `_mock_` registration ID; `circle-actions` / `get-circle` / `organizer-stats` by a token whose payload has `mock: true`; `admin-auth` by a `DEMO-` venue ID; `verify-ticket` by a per-tab demo-session flag. Demo data lives in each browser's `localStorage`; `window.solosaathiMock.reset()`, `.finalizeAdvance()` and `.mergeSmallCircles()` help in the console. The demo backend ignores the live-registration time window and runs the scheduled job before each request.

**Keep `mockApi.js` in sync with the backend.** Any change to a rule, message, status code or response shape in `netlify/` must land in the mock in the same change, and `npm test` (the contract tests in `tests/mock-api.test.mjs`) must pass. `scripts/create-organizer.js` refuses `DEMO-` venue IDs.

## Backend architecture (`netlify/`)

**Function discovery via shims.** The real handlers live in category folders (`otp/`, `registration/`, `payments/`, `circle/`, `organizer/`, `ticket-verification/`, `scheduled/`). Netlify only discovers top-level files, so each endpoint also needs a one-line shim at `netlify/functions/<name>.js` (`module.exports = require('./<category>/<name>')`). The shim filename is the public route (`/.netlify/functions/<name>`). When you add a function, add its shim too. The scheduled functions (`auto-finalize` every 15 minutes, `cleanup-expired` daily) declare their schedules in `netlify.toml`, not in the handler files, because they are exposed through shims.

**Shared modules (`netlify/shared/`).** Handlers should go through these rather than reimplementing them:
- `response.js`: every response uses the envelope `{ success: true, data }` / `{ success: false, error, details }` via `successResponse` / `errorResponse`. Handlers start with `if (event.httpMethod === 'OPTIONS') return handleOptions();`. CORS comes from `ALLOWED_ORIGIN` (unset means `*`, for local development only).
- `constants.js`: all business rules live here: gender cap, group sizes, OTP limits and the 15-minute lockout, switch-circle limits, IST live window, `EVENT_START_TIME_IST` (7:30 PM; drives the advance cutoff and the 48h / 12h circle steps), merge sizes, circle name prefixes. The wording of `CHAT_CLOSE_MESSAGE` must not be changed.
- `db.js`: the only Firestore access layer (get/save functions plus `runTransaction`, `runBatch`, `getDocRef`, `FieldValue`, and the doc-ID builders). Partitioned docs (`pools`, `groupstate`, `showups`) use slugified composite IDs like `{city}_{venue}_{level}_{genderPref}_{date}` (built in `keys.js`). `groupstate.circleIds` lists every circle of a partition (stats and merges read it). `getCurrentCircleState()` follows `mergedInto`. `organizers/{VENUE_ID}` holds organizer accounts. If `FIREBASE_SERVICE_ACCOUNT` is missing, `db` is `null` and calls throw.
- `matching.js`: pure matching and time logic (`buildCircleId`, `buildCircleName`, `checkGenderCap`, `shouldStartNewBucket`, `planSmallCircleMerges`, `getIstTime`, `getHoursUntilEvent`, `isLiveRegistrationOpen`, `isAdvanceRegistrationOpen`). Circle IDs are unique per venue and night: `TAAL-01_ahmedabad_united_way_garba_grounds_2026_10_17`; display names are `TAAL 01`.
- `circles.js`: builds circle documents (`createCircleState`, `toCircleMember`, `ensureCaptain`) and the `circleSummary()` shape every endpoint returns to the frontend. Circles never store phone numbers.
- `session.js`: attendee sessions. `verify-otp` returns a 12-hour HMAC token (`ATTENDEE_SESSION_SECRET`); `find-my-circle`, `circle-actions` and `get-circle` call `requireAttendee(event)` and only act on registrations of that phone. A 401 carries `details.sessionRequired`.
- `payment-helpers.js`: `joinMatchingBucket()` is the single, idempotent entry point that puts a paid attendee into a circle or pool.
- `advance-circles.js`: the two advance steps, used by `scheduled/auto-finalize` and the admin `circle/finalize-bucket` (`mergeSmallCircles: true` runs step 2 on demand).
- `pricing.js`: `PEAK_DATES` gives ₹199 standard or ₹249 peak pricing. The price is always computed server-side. `frontend/src/pages/RegisterAdvancePage.jsx` has its own copy of `PEAK_DATES` for display, so keep the two in sync.
- `netlify/config/env.js`: centralized env access that fails fast at cold start if any required var is missing (all except `OTP_DEV_MODE` and `SMS_*`). Most functions import it transitively (for example through `whatsapp.js` or `verify-ticket.js`), so locally every required var needs at least a placeholder value.

**Payment-gated registration flow.** Nobody is placed in a circle or pool until payment is verified:
1. `send-otp` / `verify-otp` create a 30-minute verified session keyed by WhatsApp number.
2. `register` (live) or `advance-register` saves a draft registration (`paymentStatus: 'pending'`, `circleId: null`) and returns `nextStep: create_order`.
3. `create-order` creates the Razorpay order and stores `orderId` on the registration.
4. `verify-payment` (client HMAC check, which also requires the stored `orderId` to match) or `webhook` (raw-body HMAC) confirms payment. Either one then calls `joinMatchingBucket()`.
   - Live: instant assignment inside a Firestore transaction across `groupstate`, `circles`, and `registrations`.
   - Advance: appended to `pools`, then circles form in two steps (`scheduled/auto-finalize`, every 15 minutes):
     1. 48h before the event start (or once a pool reaches 12), every pool becomes circles, whatever its size (<= 24, gender cap).
     2. From 12h before the start (e.g. 7:30 AM for a 7:30 PM event), circles of 1–3 people merge into a circle with at most 10 people: same tier first, else a neighbouring tier (beginner <-> intermediate <-> advanced, never beginner <-> advanced), fuller receiver first, ties to the lower tier. Gender cap and 24 still apply, all-women only merge with all-women, and live circles (`origin: 'live'`) are never merged. The small circle gets `status: 'merged'` + `mergedInto`; circles with nowhere to go get `needsOrganizerAttention` (shown on the dashboard). The step re-runs until the start and is idempotent.

Keep multi-document read-modify-write changes inside `runTransaction` or `runBatch`. See `docs/database.md` §3 for which operations use which.

**Time windows (IST).** Live registration only accepts requests on or after `LIVE_SEASON_START_DATE` (2026-10-13), between 18:30 and 01:30 IST. After midnight, requests count toward the previous night. There is no dev bypass, so outside that window live `/register` rejects by design. Advance registration closes at 17:30 IST on the event date.

**Other endpoints.** `circle-actions` takes a single `action` field (`grow`, `lock`, `leave`, `transferCaptain`, `showup`, `switchCircle`) plus the caller's own `registrationId`; `grow` / `lock` / `transferCaptain` are captain-only, and `switchCircle` takes `newSkillLevel` (same venue and night) or `targetCircleId`. `find-my-circle` (session required; the phone comes from the token) looks up every registration for that number and sorts it into live, upcoming, or past. `get-circle` returns one circle to its members (the circle page uses it after a reload). `admin-auth` checks organizer accounts (salted scrypt in `organizers/`, created with `scripts/create-organizer.js`) and issues 12-hour tokens carrying `venueId`, `city`, `venue`; the `ADMIN_SECRET` master login works only with `ALLOW_MASTER_ADMIN_LOGIN=true`. `organizer-stats` reads the venue from the token and returns aggregates only, with no names, phone numbers, or revenue. Registration IDs are `reg_live_<ts>_<hex>` / `reg_adv_<ts>_<hex>` (no phone numbers). `firestore.rules` denies all client access; only the Admin SDK touches Firestore.

Log phone numbers masked (`***${phone.slice(-4)}`) and secrets via `maskSecret()`.

## Frontend architecture (`frontend/src/`)

- **API:** always call through `api/apiClient.js` (`apiPost`, `apiGet`, `postRequest`, …) with the shim name as the path (`apiPost('/send-otp', …)`). It unwraps the `data` envelope and throws `ApiError(message, status, details)`. The base URL comes from `VITE_API_BASE_URL`, else `http://localhost:8888/.netlify/functions` on localhost, else relative `/.netlify/functions`. It also stores the attendee session from `verify-otp` (per phone, in `localStorage`) and sends it automatically to `find-my-circle`, `circle-actions` and `get-circle`; use `hasAttendeeSession(phone)` to decide whether to show `OtpVerificationModal` first. It routes demo requests to `mockApi.js` (see Demo mode).
- **Styling:** there is no CSS framework. Components use inline `style={{…}}` objects built from theme tokens. Call `const theme = useTheme()` inside the component body (never at module scope, and never as a default parameter) and read from `theme.colors`, `theme.gradients`, `theme.fonts`, and so on. `styles/theme.js` exports frozen `lightTheme` and `darkTheme`, with light as the default. The toggle lives in `ThemeContext` (`useThemeMode`) and is persisted in `localStorage` under `solosaathi_theme`. Don't hardcode hex colors, because they break theme switching.
- **Mobile layout rules** (each one fixed a real bug):
  - Give page root containers `width: '100%'` along with `maxWidth` and `margin: '0 auto'`. `<main>` is a flex column, so without it the page shrinks to its content's width and overflows on phones.
  - Render full-screen overlays (modals, `BeaconPulse`) through `components/common/Portal.jsx`. `<main>` has its own stacking context, so an in-place `position: fixed` overlay renders below the sticky NavBar and BottomNav.
  - `AppShell` reserves space for `BottomNav`, so pages don't need extra bottom padding for it.
  - `globalStyles.js` forces form fields to 16px on phones to prevent iOS focus-zoom.
- **Routing:** `router.jsx` lazy-loads every page inside `AppShell` (NavBar, desktop Footer, mobile `BottomNav`). Pages include the multi-step pieces `OtpVerificationModal`, `TicketUploadStep`, and `PaymentStep`, which live in `pages/` but are embedded in the register flows, not routed.
- **State:** `AppContext` holds the user and the active circle (both persisted to `localStorage`), selected city and venue, and the alerts list (the Alerts page and the nav badges read the same list). Organizer tokens go in `sessionStorage` only.
- **Icons:** `lucide-react`. Brand PNGs are in `assets/logo/`. The SVG logo components there are deprecated fallbacks.
- **Skill levels:** the display data (label, icon, tag, desc, colors) lives in `theme.levels`. For level-colored text use `level.textColor`, not `level.color`: the bright accent is unreadable on light-mode backgrounds.
- **Accent text:** the same applies to the brand accents. For `color:` use `theme.colors.goldText`, `amberText`, `cyanText`, `pinkText`, `liveGreenText` (darker in light mode, equal to the accent in dark mode); use `gold`, `amber`, etc. only for fills, borders and icons. `PrimaryButton` text is `textDark` in both themes and takes a `loading` prop.
- **Text on special surfaces:** use `theme.colors.textDanger` for error text, and `textOnDark` / `textOnDarkMuted` on surfaces that stay dark in both themes (for example `gradients.ctaCard` and the Beacon panels). For fills, use `surfaceElevated` rather than dark `rgba(...)` values, which turn into grey slabs in light mode.
- **Circle page:** `CircleActivePage.jsx` loads the circle in the URL through `get-circle` (shows the persisted `activeCircle` meanwhile, asks for OTP when there is no session, and follows merges). Circle tools (grow, lock, transfer, leave) are in `components/circle/CircleToolsModal.jsx`; the SOS button reads `VITE_SOS_WHATSAPP` and is hidden when unset.
- **Chat is hidden for launch.** `pages/CircleChatPage.jsx` is kept but not routed; `/chat/:id` redirects to `/circle/:id`, and `find-my-circle` returns `hasChatAccess: false` / `chatLink: null`.

## Docs

`docs/` holds detailed handoff logs: `BACKEND_HANDOFF_LOG.md` (db contract shapes, env vars, payment security), `database.md` (Firestore collections and transactions), `frontend.md` (design tokens, the endpoint-to-caller table), `PHASE_AUDIT_LOG.md` (contract fixes), and `HANDOVER_README.md` (manual E2E test script and pre-launch checklist). Some early sections describe superseded designs (Netlify Blobs, Claude Vision, unwrapped writes), so check them against the code. When changing a request or response shape, update both the function and its frontend caller, since the audit log records past mismatches between them.
