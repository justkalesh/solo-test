# SoloSaathi Circle — Backend Handoff Log

## Phase 1: Foundation Layer (config + shared utilities) — 2026-09-14

### Plain-English Summary

In this initial phase, we have constructed the foundational shared plumbing and configuration layer for the **SoloSaathi Circle** backend. SoloSaathi Circle operates on Netlify Functions (serverless Node.js endpoints) backed by Netlify Blobs for state storage.

Instead of writing registration, matching, or payment code directly with ad-hoc logic, we built seven clean, reusable building blocks that every subsequent API endpoint will depend upon:

1. **Centralized Environment Configuration (`netlify/config/env.js`)**:
   Prevents any part of the codebase from reading `process.env` directly. Validates all mandatory credentials at cold-start so that missing keys crash the deployment loudly on boot instead of failing mid-request when a live festival attendee attempts to pay or register.
2. **Business Rules & Constants (`netlify/shared/constants.js`)**:
   Codifies all operational constants in a single place: gender balancing caps (`GENDER_CAP = 10`), minimum thresholds for all-women circles (`ALL_WOMEN_MIN_FLOOR = 4`, `ALL_WOMEN_ABSOLUTE_MIN = 3`), group caps (`SOFT_MAX_GROUP = 24`), daily IST festival operation windows (6:30 PM to 1:30 AM), OTP TTLs, rate limits, circle naming tokens (`GARBA`, `TAAL`, `RAAS`, `SAKHI`), and the official festival closing chat message.
3. **HTTP Response Formatting (`netlify/shared/response.js`)**:
   Standardizes JSON API responses across all endpoints into `{ success: true, data }` or `{ success: false, error, details }`, complete with open CORS headers and an HTTP `OPTIONS` preflight handler.
4. **Input Validation (`netlify/shared/validators.js`)**:
   Safely checks incoming request bodies for attendee registration, OTP dispatch, OTP verification, and payment order initialization. Accumulates all errors into an array so the frontend client can display all validation feedback in one go, without throwing unhandled exceptions.
5. **Dynamic Festival Pricing (`netlify/shared/pricing.js`)**:
   Determines standard registration fees (₹199) versus high-demand peak weekend dates (₹249), and formats currency into integer paise (multiplying by 100) as required by Razorpay Orders API.
6. **WhatsApp & SMS Outbound Messaging (`netlify/shared/whatsapp.js`)**:
   A generic gateway for outbound WhatsApp template messages through a Business Solution Provider (BSP) with fallback to SMS (DLT template compliant). When `OTP_DEV_MODE` is enabled, outgoing network calls are safely bypassed and simulated in the console logs.
7. **Database Interface Contract Stub (`netlify/shared/db.js`)**:
   Defines the complete function interface and data contract for our persistence layer. Every stub throws an explicit error pointing to this handoff document so that the rest of the backend team knows exactly what functions and arguments exist while our database teammate builds the concrete Netlify Blobs storage implementation.

---

### For the Database Teammate

All database operations in SoloSaathi Circle are abstracted behind `netlify/shared/db.js`. Below is the complete contract specification for all **18 functions** you will implement using **Netlify Blobs**.

Each function must be `async` and return a Promise resolving to the specified shape. Suggested Netlify Blobs store keys and partitioning paths are provided for each operation.

---

#### 1. `getRegistration(id)`
- **Purpose**: Fetch an attendee's registration record by unique ID.
- **Suggested Key**: `registrations:{id}` in store `solosaathi-data`
- **Parameters**:
  - `id` (`string`): The unique registration identifier (e.g., `'reg_live_9876543210_1729000000'`).
- **Expected Return Shape**:
  ```json
  {
    "id": "reg_live_9876543210_1729000000",
    "name": "Aarav Mehta",
    "whatsapp": "9876543210",
    "city": "Ahmedabad",
    "venue": "United Way Garba Grounds",
    "gender": "male",
    "ageBand": "21-25",
    "skillLevel": "intermediate",
    "allWomenToggle": false,
    "captainOptIn": true,
    "ticketSerial": "UWG-2026-88412",
    "ticketPhoto": null,
    "verifiedTicket": true,
    "registrationType": "live",
    "eventDate": "2026-10-14",
    "paymentStatus": "paid",
    "paymentId": "pay_O123456789",
    "circleId": "circle_taal_toli_04",
    "createdAt": 1728910800000
  }
  ```
  Returns `null` if no record exists for that `id`.

---

#### 2. `saveRegistration(id, registrationData)`
- **Purpose**: Insert or update an attendee registration record.
- **Suggested Key**: `registrations:{id}`
- **Parameters**:
  - `id` (`string`): Registration ID.
  - `registrationData` (`Object`): Complete registration object (matching the shape above).
- **Expected Return Shape**: Returns the saved `registrationData` object upon success.

---

#### 3. `getRegistrationsByMobile(whatsapp, date)`
- **Purpose**: Find all registrations created by a given mobile number for a specific night (used to check if a user is already registered tonight or lookup previous bookings).
- **Suggested Key**: Index key `bymobile:{whatsapp}:{date}` containing an array of registration IDs or objects.
- **Parameters**:
  - `whatsapp` (`string`): Normalized 10-digit mobile number (e.g., `'9876543210'`).
  - `date` (`string`): Target event date in `'YYYY-MM-DD'` format.
- **Expected Return Shape**:
  ```json
  [
    {
      "id": "reg_live_9876543210_1729000000",
      "circleId": "circle_taal_toli_04",
      "paymentStatus": "paid"
    }
  ]
  ```
  Returns an empty array `[]` if no registrations exist for that phone on that date.

---

#### 4. `getPendingPool(city, venue, level, genderPref, eventDate)`
- **Purpose**: Retrieve the queue of attendees waiting to be grouped in a specific matching pool.
- **Suggested Key**: `pools:{city}:{venue}:{level}:{genderPref}:{eventDate}`
  (e.g., `pools:Ahmedabad:United Way Garba Grounds:intermediate:mixed:2026-10-14`)
- **Parameters**:
  - `city` (`string`): Event city.
  - `venue` (`string`): Specific ground/venue.
  - `level` (`string`): `'beginner'`, `'intermediate'`, or `'advanced'`.
  - `genderPref` (`string`): `'mixed'` or `'allWomen'`.
  - `eventDate` (`string`): Event date in `'YYYY-MM-DD'` format.
- **Expected Return Shape**:
  Array of queued attendee objects:
  ```json
  [
    {
      "registrationId": "reg_live_9876543210_1729000000",
      "name": "Pooja Patel",
      "gender": "female",
      "captainOptIn": true,
      "joinedPoolAt": 1728910900000
    }
  ]
  ```
  Returns an empty array `[]` if the pool is currently empty.

---

#### 5. `savePendingPool(city, venue, level, genderPref, eventDate, poolArray)`
- **Purpose**: Persist the updated queue after attendees join or after a batch is removed for circle formation.
- **Suggested Key**: `pools:{city}:{venue}:{level}:{genderPref}:{eventDate}`
- **Parameters**:
  - `city`, `venue`, `level`, `genderPref`, `eventDate`: Partition identifiers.
  - `poolArray` (`Array<Object>`): The updated list of queued attendees.
- **Expected Return Shape**: Returns the saved `poolArray`.

---

#### 6. `getGroupState(city, venue, level, genderPref, date)`
- **Purpose**: Retrieve the metadata for the active grouping partition tonight (tracks active circle count, total formed circles, and overflow counters).
- **Suggested Key**: `groupstate:{city}:{venue}:{level}:{genderPref}:{date}`
- **Parameters**:
  - `city`, `venue`, `level`, `genderPref`, `date`: Partition identifiers.
- **Expected Return Shape**:
  ```json
  {
    "activeCircleIds": ["circle_taal_toli_01", "circle_taal_toli_02"],
    "totalAttendeesMatched": 32,
    "lastCircleCounter": 2,
    "updatedAt": 1728911500000
  }
  ```
  Returns `null` if this partition hasn't been initialized tonight.

---

#### 7. `saveGroupState(city, venue, level, genderPref, date, stateObject)`
- **Purpose**: Update the partition state when new circles are created or merged.
- **Suggested Key**: `groupstate:{city}:{venue}:{level}:{genderPref}:{date}`
- **Parameters**:
  - Partition identifiers and `stateObject` (`Object`).
- **Expected Return Shape**: Returns the saved `stateObject`.

---

#### 8. `getCircleState(circleId)`
- **Purpose**: Retrieve the full operational details of a specific formed Circle.
- **Suggested Key**: `circles:{circleId}` (e.g., `circles:circle_garba_toli_01`)
- **Parameters**:
  - `circleId` (`string`): Unique circle ID.
- **Expected Return Shape**:
  ```json
  {
    "circleId": "circle_taal_toli_01",
    "name": "TAAL TOLI 1",
    "skillLevel": "intermediate",
    "isAllWomen": false,
    "city": "Ahmedabad",
    "venue": "United Way Garba Grounds",
    "eventDate": "2026-10-14",
    "captainId": "reg_live_9876543210_1729000000",
    "captainName": "Aarav Mehta",
    "meetingPoint": "Near Gate 3 Food Stalls",
    "chatLink": "https://chat.whatsapp.com/sample_invite_hash",
    "members": [
      {
        "registrationId": "reg_live_9876543210_1729000000",
        "name": "Aarav Mehta",
        "gender": "male",
        "isCaptain": true,
        "joinedAt": 1728911000000
      }
    ],
    "maleCount": 8,
    "femaleCount": 8,
    "totalCount": 16,
    "status": "active",
    "closedAt": null,
    "createdAt": 1728911000000
  }
  ```
  Returns `null` if the circle does not exist.

---

#### 9. `saveCircleState(circleId, stateObject)`
- **Purpose**: Persist circle updates (new member joined, member switched out, captain reassigned, chat link attached).
- **Suggested Key**: `circles:{circleId}`
- **Parameters**:
  - `circleId` (`string`): Unique circle ID.
  - `stateObject` (`Object`): Complete updated circle state.
- **Expected Return Shape**: Returns the saved `stateObject`.

---

#### 10. `getShowups(city, venue)`
- **Purpose**: Retrieve the list of attendees who have physically checked in / scanned in at the venue ground tonight.
- **Suggested Key**: `showups:{city}:{venue}:{current_date}`
- **Parameters**:
  - `city` (`string`), `venue` (`string`).
- **Expected Return Shape**:
  ```json
  [
    {
      "registrationId": "reg_live_9876543210_1729000000",
      "circleId": "circle_taal_toli_01",
      "checkedInAt": 1728911200000,
      "gate": "Gate 2"
    }
  ]
  ```
  Returns `[]` if no check-ins have occurred yet.

---

#### 11. `saveShowups(city, venue, showupsArray)`
- **Purpose**: Save the updated list of venue check-in events.
- **Suggested Key**: `showups:{city}:{venue}:{current_date}`
- **Parameters**:
  - `city` (`string`), `venue` (`string`), `showupsArray` (`Array<Object>`).
- **Expected Return Shape**: Returns the saved `showupsArray`.

---

#### 12. `getOtpRecord(whatsapp)`
- **Purpose**: Retrieve the currently active OTP record for a mobile number.
- **Suggested Key**: `otp:{whatsapp}`
- **Parameters**:
  - `whatsapp` (`string`): Normalized 10-digit mobile number.
- **Expected Return Shape**:
  ```json
  {
    "code": "492817",
    "expiresAt": 1728912400000,
    "attempts": 1,
    "createdAt": 1728911800000
  }
  ```
  Returns `null` if no OTP has been issued or it has expired.

---

#### 13. `saveOtpRecord(whatsapp, otpData)`
- **Purpose**: Store a newly generated OTP or increment failed verification attempts.
- **Suggested Key**: `otp:{whatsapp}`
- **Parameters**:
  - `whatsapp` (`string`): Mobile number.
  - `otpData` (`Object`): `{ code: string, expiresAt: number, attempts: number, createdAt: number }`.
- **Expected Return Shape**: Returns the saved `otpData`.

---

#### 14. `getOtpRateLimit(whatsapp)`
- **Purpose**: Check how many OTPs have been requested by this mobile number in the current rolling 15-minute window.
- **Suggested Key**: `otplimit:{whatsapp}`
- **Parameters**:
  - `whatsapp` (`string`): Mobile number.
- **Expected Return Shape**:
  ```json
  {
    "count": 2,
    "windowStartTime": 1728911800000,
    "lastSentAt": 1728911950000
  }
  ```
  Returns `null` if no rate-limit record exists.

---

#### 15. `saveOtpRateLimit(whatsapp, rateLimitData)`
- **Purpose**: Update the OTP request count and timestamp for a phone number.
- **Suggested Key**: `otplimit:{whatsapp}`
- **Parameters**:
  - `whatsapp` (`string`), `rateLimitData` (`Object`).
- **Expected Return Shape**: Returns the saved `rateLimitData`.

---

#### 16. `getVerifiedStatus(whatsapp)`
- **Purpose**: Check if a mobile number has recently completed valid OTP verification (valid for 30 minutes to complete registration without re-verifying).
- **Suggested Key**: `verified:{whatsapp}`
- **Parameters**:
  - `whatsapp` (`string`): Mobile number.
- **Expected Return Shape**:
  ```json
  {
    "verified": true,
    "verifiedAt": 1728912000000,
    "expiresAt": 1728913800000
  }
  ```
  Returns `null` if not verified or if the 30-minute window has expired.

---

#### 17. `saveVerifiedStatus(whatsapp, timestamp)`
- **Purpose**: Record a successful OTP verification session.
- **Suggested Key**: `verified:{whatsapp}`
- **Parameters**:
  - `whatsapp` (`string`): Mobile number.
  - `timestamp` (`number`): Epoch millisecond timestamp of verification.
- **Expected Return Shape**:
  ```json
  {
    "verified": true,
    "verifiedAt": 1728912000000,
    "expiresAt": 1728913800000
  }
  ```

---

#### 18. `getVenues()`
- **Purpose**: Return the catalog of supported Garba festival grounds and their approximate geo-coordinates across cities.
- **Suggested Key**: `config:venues` (or read from static fallback in Netlify Blobs).
- **Parameters**: None.
- **Expected Return Shape**:
  Dictionary mapping city name to array of venue objects:
  ```json
  {
    "Ahmedabad": [
      { "name": "United Way Garba Grounds", "lat": 23.0395, "lng": 72.5661 },
      { "name": "Rajpath Club", "lat": 23.0303, "lng": 72.5108 },
      { "name": "GMDC Ground", "lat": 23.0469, "lng": 72.5316 }
    ],
    "Surat": [
      { "name": "VR Surat Grounds", "lat": 21.1959, "lng": 72.7933 },
      { "name": "Sarthana Ground", "lat": 21.2280, "lng": 72.8619 }
    ],
    "Vadodara": [
      { "name": "Akota Stadium Grounds", "lat": 22.2967, "lng": 73.1631 }
    ]
  }
  ```

---

### Environment Variables Required So Far

The configuration module `netlify/config/env.js` manages 11 variables. All except `OTP_DEV_MODE` and the `SMS_*` family are strictly **mandatory**:

| Variable Name | Required? | Description & Purpose |
| :--- | :---: | :--- |
| `ADMIN_SECRET` | **YES** | Shared secret key for authenticating internal operations, cron triggers, and organizer administrative endpoints. |
| `WHATSAPP_API_KEY` | **YES** | API key / Bearer token provided by the WhatsApp Business Solution Provider (Interakt, AiSensy, or Gupshup). |
| `WHATSAPP_API_URL` | **YES** | HTTPS REST API endpoint URL of the WhatsApp BSP for dispatching template messages. |
| `SMS_API_KEY` | Optional | API token for the secondary SMS fallback provider. Optional on deploy; logs a warning if unset. |
| `SMS_API_URL` | Optional | HTTPS REST endpoint for the SMS fallback provider. |
| `SMS_DLT_TEMPLATE_ID` | Optional | Indian Telecom TRAI/DLT-approved template ID for transactional OTP and registration SMS alerts. |
| `ANTHROPIC_API_KEY` | **YES** | API key for Anthropic Claude Vision, used in Phase 2 for instant optical inspection and verification of festival tickets. |
| `RAZORPAY_KEY_ID` | **YES** | Live Razorpay Key ID (`rzp_live_...`) for creating checkout orders and payment links. |
| `RAZORPAY_KEY_SECRET` | **YES** | Live Razorpay Key Secret for generating HMAC-SHA256 signatures and verifying order authenticity. |
| `RAZORPAY_WEBHOOK_SECRET`| **YES** | Secret token configured in Razorpay Webhooks dashboard to authenticate inbound payment event payloads. |
| `TICKET_TOKEN_SECRET` | **YES** | Dedicated secret for signing/verifying AI ticket verification tokens, kept separate from ADMIN_SECRET so a leak of one doesn't compromise the other. |
| `OTP_DEV_MODE` | Optional | Set to `'true'` or `'1'` during local testing. Bypasses real WhatsApp/SMS calls and logs OTP codes to the console. Defaults to `false`. **Must never be true in production.** |

---

### Assumptions Made

1. **WhatsApp BSP REST Shape**:
   Because the exact BSP (Interakt, AiSensy, or Gupshup) is being finalized, `sendWhatsAppMessage` currently assumes a standard REST POST payload shape: `{ to, template, params }`, with both `Authorization: Bearer <key>` and `x-api-key: <key>` headers attached. Once the BSP contract is signed, only the payload formatting in `netlify/shared/whatsapp.js` will need minor adjustments.
2. **Indian Mobile Format**:
   Mobile numbers are expected to be 10 digits starting with 6, 7, 8, or 9. The validator accepts raw 10-digit strings as well as strings prefixed with `+91` or `91`, stripping whitespace and dashes before validation.
3. **SMS Gateway Shape**:
   Assumed standard REST POST body `{ to, message, dltTemplateId }` with API key headers.
4. **Peak Navratri Dates**:
   Configured placeholder peak weekend dates in `netlify/shared/pricing.js` (`2026-10-17`, `2026-10-18`, `2026-10-24`, `2026-10-25`). These correspond to the Saturday/Sunday nights of the Navratri 2026 season and should be reviewed against local ground organizers' peak ticket schedules.
5. **Runtime Architecture**:
   All Netlify serverless functions use CommonJS (`require` / `module.exports`) to ensure maximum compatibility with the default Netlify Functions Node.js runtime.
6. **Netlify Blobs Scope**:
   Assumed that all 18 persistence functions will operate against a centralized or partition-scoped Netlify Blobs store (e.g., using `@netlify/blobs`).

---

### Not Built Yet (Deferred to Phases 2 & 3)

The following capabilities are deliberately out of scope for Phase 1 and will be built in subsequent phases:

- **Phase 2 — Ingestion, Authentication & Verification**:
  - `netlify/functions/otp-send.js`: Handles phone input, enforces rate limiting, generates random 6-digit code, and dispatches via WhatsApp/SMS.
  - `netlify/functions/otp-verify.js`: Compares code, decrements allowed attempts, and issues 30-minute verified session status.
  - `netlify/functions/register-live.js`: Handles walk-up attendee registration during festival hours.
  - `netlify/functions/register-advance.js`: Queues advance registrations into the batch pool.
  - `netlify/functions/verify-ticket.js`: Claude Vision pipeline inspecting uploaded ticket photos for date, venue, and authenticity.
- **Phase 3 — Matching Engine, Payment & Operations**:
  - `netlify/functions/payment-init.js`: Calls Razorpay Orders API to generate live payment tokens for ₹199 or ₹249.
  - `netlify/functions/payment-webhook.js`: Verifies Razorpay HMAC signature, records payment success, and pushes attendee to active matching pool.
  - `netlify/functions/match-live.js`: Instant matching engine grouping attendees into gender-balanced Circles (12–16 target, 24 soft max, gender cap 10, all-women minimum 4).
  - `netlify/functions/match-batch.js`: Scheduled cron job running before festival gates open to form advance circles.
  - `netlify/functions/switch-circle.js`: Handles attendee requests to switch circles (subject to the 5-minute lock, 20-minute cooldown, and 3-switch nightly limit).
  - `netlify/functions/captain-tools.js`: Enables designated circle captains to set meeting spots and broadcast announcements.
  - `netlify/functions/chat-close-cron.js`: Nightly 1:00 AM IST cron job archiving ephemeral circle chats and dispatching the official closing message.
  - `netlify/functions/showups.js`: Real-time organizer dashboard for scanning attendee tickets at venue gates.

---

## Phase 2: Core Business Logic — 2026-09-15

### Plain-English Summary

In this second phase, we implemented the complete core operational logic for SoloSaathi Circle across attendee registration, authentication, AI ticket fraud inspection, group matching algorithms, circle participant lifecycle, organizer analytics, and background scheduling.

1. **Circle Matching Engine (`netlify/shared/matching.js`)**:
   Implements deterministic Circle ID construction (`{PREFIX}-{2-digit index}` using `CIRCLE_PREFIX`), partition key formatting (`groupstate:...` for live vs `pending:...` for advance), capacity threshold evaluations (`SOFT_MAX_GROUP = 24`), strict gender balancing (`GENDER_CAP = 10` per declared gender in mixed circles, with 'prefer_not_to_say' exempted and all-women circles bypassing the cap), skill-level grouping with adjacent-level fallback rules, and IST operating window checks.
2. **OTP Dispatch & Anti-Fraud Verification (`netlify/functions/otp/send-otp.js`, `verify-otp.js`)**:
   - `send-otp.js`: Validates mobile input, generates a 6-digit numeric code with 10-minute expiry, enforces rate limits (max 3 sends per 15 minutes, 30s cooldown between sends), checks for previous brute-force lockouts, and dispatches via WhatsApp Business API with automated SMS fallback.
   - `verify-otp.js`: Validates submitted codes, sets 30-minute verified session status (`OTP_VERIFIED_TTL_MINUTES = 30`), and implements the strict **5-attempt hard block** (`OTP_MAX_VERIFY_ATTEMPTS = 5`) where exceeding 5 wrong attempts permanently locks the code with NO manual override allowed.
3. **Live Walk-Up Registration (`netlify/functions/registration/register.js`)**:
   Operates only on/after October 13, 2026 during festival operating hours (6:30 PM to 1:30 AM IST). Validates 30-minute OTP verification status, accepts either ticket serial OR photo, performs optional Claude Vision OCR and venue mismatch warning, instantly matches attendee to an active Circle respecting the 10-person gender cap and 24-person soft cap, assigns a Circle Captain, and persists the registration record.
4. **Advance Registration (`netlify/functions/registration/advance-register.js`)**:
   Allows pre-event registration anytime up until 2 hours before the event's 7:30 PM IST start (5:30 PM IST cutoff). Requires mandatory ticket photo OCR inspection, warns on venue discrepancies, and queues attendees into partitioned pending pools (`db.getPendingPool` / `db.savePendingPool`) for batch grouping.
5. **Server-Side AI Ticket Inspection (`netlify/functions/ticket-verification/verify-ticket.js`)**:
   Securely invokes Anthropic Claude Vision server-side (keeping `ANTHROPIC_API_KEY` hidden from clients) to extract city, venue, pass ID, and plausibility check. Issues cryptographic `ticketVerifiedToken` signed with `TICKET_TOKEN_SECRET`, and fuzzy-matches printed tickets against attendee-chosen venues to flag venue mismatches as non-blocking warnings.
6. **Circle Batch Finalizer (`netlify/functions/circle/finalize-bucket.js`)**:
   An administrative endpoint protected by `ADMIN_SECRET` converting pending pools into finalized circles, electing the first opted-in captain, updating attendee documents with their circle IDs, and updating group partition counters.
7. **Circle Participant Lifecycle & Switching (`netlify/functions/circle/circle-actions.js`)**:
   Provides unified action handling:
   - `grow`: Opens 1–20 additional spots (`GROW_MIN_SPOTS` to `GROW_MAX_SPOTS`) and unlocks the circle.
   - `lock`: Locks circle from additional entrants.
   - `leave`: Removes attendee, frees capacity, and auto-elects replacement captain if the current captain departs.
   - `transferCaptain`: Reassigns captain role with cancel support.
   - `showup`: Logs physical venue gate check-ins for venue attendance tracking.
   - `switchCircle`: Allows attendees to switch groups subject to: max 3 switches per night (`SWITCH_CIRCLE_MAX_PER_NIGHT = 3`), 5-minute initial lock after joining (`SWITCH_CIRCLE_LOCK_MINUTES = 5`), 20-minute cooldown between switches (`SWITCH_CIRCLE_COOLDOWN_MINUTES = 20`), and target circle capacity/gender caps.
8. **Attendee Portal & Access Tiers (`netlify/functions/circle/find-my-circle.js`)**:
   Retrieves all registrations for a phone number across past, present, and future festival nights. Enforces access tiers:
   - **Tonight (Live)**: Full access to Beacon meeting point and WhatsApp group chat link.
   - **Past Nights**: Read-only pass archive; Beacon and Chat links are strictly withheld after festival closure.
   - **Upcoming Nights**: Registration pass visible; group chat pending batch finalization.
9. **Organizer Authentication & Dashboard (`netlify/functions/organizer/admin-auth.js`, `organizer-stats.js`)**:
   - `admin-auth.js`: Authenticates venue organizers via Venue ID + Password (no browsable venue catalog exposed) and issues 12-hour signed session tokens.
   - `organizer-stats.js`: Returns venue-scoped aggregate analytics (total registrations, Live vs Advance split, skill breakdown, gender balance, circles formed, average group size, all-women circle count, show-up rate). **Strict server-side whitelist** completely excludes money, attendee names, and phone numbers from the response payload.
10. **Automated Scheduled Finalization (`netlify/functions/scheduled/auto-finalize.js`)**:
    Configured with Netlify Scheduled Function cron `@hourly` (`0 * * * *`). Traverses upcoming events and triggers circle formation when an event enters the 48-hour pre-event window (`hoursUntilEvent <= 48`) with viable quorum, or whenever a pool organically reaches a healthy group size (12+ attendees).

---

### Payment is Stubbed

In this phase, payment processing is intentionally decoupled and stubbed:
- `netlify/functions/registration/register.js` sets `paymentStatus: 'pending'` on every new registration.
  Look for the exact comment: `// TODO(Phase 3): gate finalization on confirmed payment`.
- `netlify/functions/registration/advance-register.js` sets `paymentStatus: 'pending'` on every pooled entry.
  Look for the exact comment: `// TODO(Phase 3): gate finalization on confirmed payment`.
- In Phase 3, these registration flows will be gated by Razorpay payment confirmation. When an attendee initiates checkout, an order ID is created (`create-order.js`); once Razorpay webhook (`webhook.js`) or client signature verification (`verify-payment.js`) confirms successful receipt of ₹199 or ₹249, `paymentStatus` will be updated to `'paid'`, transitioning the registration from pending to confirmed active matching.

---

### Still Depends on db.js

All functions written in Phase 2 interact with the database exclusively through the 18 interface methods exported by `netlify/shared/db.js`:
- `getRegistration`, `saveRegistration`, `getRegistrationsByMobile`
- `getPendingPool`, `savePendingPool`
- `getGroupState`, `saveGroupState`
- `getCircleState`, `saveCircleState`
- `getShowups`, `saveShowups`
- `getOtpRecord`, `saveOtpRecord`, `getOtpRateLimit`, `saveOtpRateLimit`, `getVerifiedStatus`, `saveVerifiedStatus`
- `getVenues`

**Reminder for the database teammate**: Until your concrete implementation using `@netlify/blobs` replaces the stub throws in `netlify/shared/db.js`, invoking any of these functions in an integration test or deploy will throw:
`NOT_IMPLEMENTED: db.js is owned by the database teammate — see docs/BACKEND_HANDOFF_LOG.md for the required contract.`

*(Update 2026-09-17: db.js is no longer a stub — it has been implemented with Firebase Cloud Firestore; see Database Migration section below).*

The business logic in Phase 2 has been written strictly against your contract specifications defined in Phase 1. As soon as your Netlify Blobs storage operations are implemented, the entire Phase 2 business suite will immediately function end-to-end without code changes.

---

### Not Built Yet (Deferred to Phase 3)

The remaining items to be built in Phase 3 are:
1. `netlify/functions/payments/create-order.js`: Razorpay Orders API order creation handler using `formatPriceForRazorpay` and `getPrice`.
2. `netlify/functions/payments/verify-payment.js`: Post-payment HMAC-SHA256 signature verification validating `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` against `RAZORPAY_KEY_SECRET`.
3. `netlify/functions/payments/webhook.js`: Inbound payment gateway webhook listener verifying `RAZORPAY_WEBHOOK_SECRET` for asynchronous payment capture and automated attendee confirmation.

---

## Database Migration: Netlify Blobs → Firebase Firestore — 2026-09-17

### Summary

The persistence layer (`netlify/shared/db.js`) has been migrated from the original Netlify Blobs stub to a **Firebase Cloud Firestore** implementation using the `firebase-admin` Node.js SDK.

### Step 1 — Signature Contract Audit Result

All 18 function signatures were verified against the original Phase 1 contract defined above. **No mismatches were found** in function names, parameter count/order, or return shapes for 17 of the 18 functions. The one function that requires scrutiny is `getRegistrationsByMobile`, detailed below.

### Step 2 — ⚠️ CONFIRMED BUG: `find-my-circle.js` × `getRegistrationsByMobile`

**This is a real semantic mismatch between the db.js implementation and the Phase 2 caller.**

**What `db.js` actually does:**

```js
// netlify/shared/db.js — getRegistrationsByMobile (line 116–125)
async function getRegistrationsByMobile(whatsapp, date) {
  const snapshot = await db.collection('registrations')
    .where('whatsapp', '==', whatsapp)
    .where('eventDate', '==', date)   // ← equality filter: ONE specific date only
    .get();
  ...
}
```

It accepts two parameters (`whatsapp`, `date`) and issues a Firestore query with **two `where` clauses** — filtering on both `whatsapp` AND `eventDate`. It returns only registrations for that single date.

**What `find-my-circle.js` actually calls (line 71):**

```js
// netlify/functions/circle/find-my-circle.js — line 71
const todayRegistrations = (await db.getRegistrationsByMobile(phone, todayDateString)) || [];
```

It passes today's IST date string as the second argument, so the query will return **only tonight's registrations**.

**Why this is a bug:**

The Phase 2 spec for `find-my-circle.js` (documented in this log, Phase 2 section, item 8) explicitly requires:

> *"Retrieves all registrations for a phone number **across past, present, and future festival nights**. Enforces access tiers…"*

The function's own file header docstring (lines 6–11) re-states this intent: *"Cross-event registration lookup across past, present, and future festival nights."*

The code then constructs `allRegistrations = [...todayRegistrations]` and runs access-tier logic that handles `'past'`, `'live'`, and `'upcoming'` tiers — but because `getRegistrationsByMobile` only ever returns **today's** records, the past and upcoming branches are dead code in practice. An attendee with advance bookings for next week, or a history of past nights, will never see those registrations in the portal.

**Root cause:** `getRegistrationsByMobile` was specified in the Phase 1 contract (item 3) as a single-date lookup tool (its stated purpose was "check if a user is already registered tonight or lookup previous bookings" for a given date). The database teammate implemented it exactly to that spec. But Phase 2 repurposed it in `find-my-circle.js` for a cross-all-dates lookup without either (a) changing the function signature to drop the `date` parameter, or (b) adding a separate `getRegistrationsByMobileAllDates(whatsapp)` function.

**Status: FIXED (see "Bug Fix Applied" below).**

### Step 3 — Infrastructure Additions Made

#### a) New mandatory environment variable: `FIREBASE_SERVICE_ACCOUNT`

Added to `netlify/config/env.js` following the same pattern as the existing required vars:
- Appended `'FIREBASE_SERVICE_ACCOUNT'` to the `REQUIRED_ENV_VARS` array (fail-fast on cold-start if missing).
- Exposed `FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT` in the frozen `config` export.

The `db.js` initialization reads `process.env.FIREBASE_SERVICE_ACCOUNT` directly and calls `JSON.parse()` on it to obtain the service account credentials object passed to `cert()`.

#### b) `firebase-admin` dependency

**Already present** in `package.json` at version `^14.4.0`. No change required.

#### Bug Fix Applied — `getRegistrationsByMobile` optional `date` param (2026-09-17)

The confirmed bug was fixed: `getRegistrationsByMobile(whatsapp, date)` now operates in two modes — when `date` is provided (truthy string) the original single-date Firestore query runs unchanged; when `date` is omitted or null the `eventDate` equality filter is dropped entirely and results are ordered by `eventDate` descending, returning every registration for that number across all festival nights. The call site in `find-my-circle.js` was updated from `db.getRegistrationsByMobile(phone, todayDateString)` to `db.getRegistrationsByMobile(phone)`, activating the all-dates path. The access-tier classification block (live / upcoming / past) and its Beacon/Chat access rules — previously dead code because only tonight's records ever arrived — is now live and functioning correctly for all registration dates.

### Known Limitations & Concurrency Risks

1. **Firestore Persistence Layer is Active (`netlify/shared/db.js`)**:
   - `db.js` is **no longer a stub**. All 18 persistence functions are implemented against Firebase Cloud Firestore (`firebase-admin` SDK) and operational.
   - The stub errors (`NOT_IMPLEMENTED: db.js is owned by the database teammate...`) have been fully replaced.

2. **Unwrapped Firestore Writes (Race Condition Risk)**:
   - **Current State**: Writes in `savePendingPool`, `saveGroupState`, and `saveRegistration` execute as standalone `.set(doc, { merge: true })` calls rather than atomic Firestore transactions (`db.runTransaction`) or batched writes.
   - **Concurrency Risk**: Under concurrent registration surges (e.g., peak festival entry window between 6:30 PM – 8:00 PM IST where dozens or hundreds of attendees register simultaneously), read-modify-write cycles against `getPendingPool`/`savePendingPool` and `getGroupState`/`saveGroupState` can race. This poses a risk of lost updates, duplicate circle allocations, or overwritten pool queues.
   - **Future Remediation (Phase 3 / Hardening)**: Wrap the batching, matching, and queue transitions into `db.runTransaction` blocks to guarantee atomic read-and-update semantics across concurrent invocations.

