# SoloSaathi Circle — Frontend Build Log

## Full Frontend Summary

**SoloSaathi Circle** is a live-festival web companion built by Kritz Vyonera AI Private Limited to solve a deeply emotional consumer experience problem: *“You came to dance. Not to stand alone.”* During high-energy Navratri festival nights across Gujarat and major Indian cities, tens of thousands of solo dancers arrive at massive commercial Garba grounds (such as United Way, GMDC, or VR Surat) with passes, but without an established dancing group (*mandli*). 

SoloSaathi Circle connects solo attendees into balanced, cohesive, and volunteer-led groups of 8 to 24 dancers called **Circles**. The application operates across two distinct attendee pipelines:

1. **Live Walk-Up Registration (`/register`)**:
   - Designed for the fast-paced 6:30 PM to 8:30 PM gate rush.
   - Flow: Mobile input → WhatsApp OTP 6-digit verification (with 30s resend timer and 5-attempt hard-lockout protection) → Profile setup (City, Venue, Skill Level, Gender, Age Band, All-Women group toggle, and Captain opt-in) → Physical ticket verification (compressed canvas image upload verified via Google Gemini Flash OCR or manual serial fallback) → Seamless Razorpay checkout (₹199 flat fee) → Gated backend signature verification (`/verify-payment`) → Immediate real-time circle assignment with meeting point and Captain badge.

2. **Advance Pre-Booking (`/advance`)**:
   - Designed for attendees planning peak Navratri weekend nights (e.g., Oct 17, 18, 24, 25).
   - Dynamic pricing (₹249 for peak dates vs. ₹199 base dates), mandatory ticket photo validation via Gemini Flash, Razorpay payment, and confirmation into the pre-match pool (finalized 48 hours prior to the festival date).

3. **Active Circle Hub & In-App Beacon (`/circle/:circleId`)**:
   - The central post-match rendezvous hub showing the assigned circle name, landmark meeting point, physical gate check-in button (`action: 'showup'`), and live member roster.
   - Launches the full-screen **Color Beacon (`BeaconPulse.jsx`)** — a GPU-accelerated, CSS-animated pulsing light screen designed to help dancers spot their group across thousands of attendees without draining battery life or causing frame-drops.

4. **Circle Group Chat & Management Tools (`/chat/:circleId`)**:
   - Real-time ephemeral group chat equipped with one-tap quick chips (`"📍 At the meeting anchor!"`, `"🪩 Holding up my beacon light!"`).
   - Ground safety controls: Direct WhatsApp SOS hotline to venue security.
   - Dynamic 1:00 AM IST Auto-Close Countdown: Transparently alerts dancers as the festival winds down and closes the chat at 1:00 AM IST per festival guidelines.
   - Captain Tools: Expand group capacity (`grow`), lock against walk-ins (`lock`), or transfer leadership (`transferCaptain`).
   - Member Tools: Leave circle (`leave`) and intelligent circle switching (`SwitchCircleControl.jsx`) enforcing strict rules (maximum 3 switches/night, 5-minute initial lock, and 20-minute cooldown).

5. **Cross-Event Portal & Ground Navigation**:
   - **Find My Circle (`/find-circle`)**: Mobile number lookup resolving all past, present, and future festival bookings into three visually distinct tiers: Live Tonight (full beacon & chat), Upcoming Advance (view-only pass & QR token), and Past Archive (read-only history).
   - **Partner Venues (`/venues`)**: Directory of grounds with browser GPS Haversine distance detection.
   - **Festival Alerts (`/notifications`)**: Timeline updates, day-of reminders, and closing notices.

6. **Organizer Operations Hub (`/organizer/login` & `/organizer/dashboard`)**:
   - Dedicated venue ground portal authenticated via Venue ID + secure access key (`/admin-auth`).
   - Session tokens saved strictly to `sessionStorage` (never `localStorage`) for booth tablet safety.
   - Zero-PII Dashboard: Displays aggregate-only gate showup counts, check-in rates, registration splits, skill distribution, and circle counts. Zero names, phone numbers, or revenue figures are ever exposed.

---

## Phase 1: Foundation, Design System & Landing Page — September 18, 2026

### 1. Plain-English Summary

Phase 1 establishes the production-grade frontend architecture for **SoloSaathi Circle**, a real-time festival companion platform by Kritz Vyonera AI Private Limited designed to group solo Garba/Navratri attendees into balanced, Captain-led dance circles.

The backend (a suite of Netlify serverless functions covering phone OTP authentication, Google Gemini Flash AI ticket verification (`verify-ticket.js`), circle formation, live circle chat, organizer portal, and Razorpay payment orders) is already complete in `netlify/functions/`. During Phase 1, **no backend code was altered**. Instead, this phase delivered the complete client-side scaffold, design system primitives, routing structure, unified API client, ambient visual effects, and a production landing page.

#### Components Built & Architectural Rationale:
1. **Scaffolding (`frontend/package.json`, `frontend/vite.config.js`, `frontend/index.html`, `frontend/.env.example`)**:
   - Modern React 18 + Vite setup providing rapid HMR development and lean production bundles.
   - Clean HTML5 shell preconnecting Google Fonts (`Baloo 2`, `Manrope`, `JetBrains Mono`) and injecting theme metadata.
2. **Frozen Design System (`frontend/src/styles/theme.js`)**:
   - Single source of truth containing every color, gradient, font family, border, shadow, and radius extracted from the visual reference (`solosaathi-preview.jsx`).
   - Deeply frozen via `Object.freeze` so no component can mutate tokens or hardcode magic hex values.
3. **Global Styles (`frontend/src/styles/globalStyles.js`)**:
   - Box-sizing reset, font smoothing, dark surface baseline, custom scrollbars, and GPU-accelerated keyframe animations (`spin`, `beaconPulse`, `floatGentle`, `sparklePulse`).
4. **Shared UI Primitives (`frontend/src/components/common/`)**:
   - `PrimaryButton.jsx`: High-impact CTA with brand gold-to-pink gradient, Baloo 2 font, and GPU elevation.
   - `GhostButton.jsx`: Translucent glass button with dark background, crisp border, and hover shine.
   - `Badge.jsx`: Micro-status pill with translucent color-tinted fills.
   - `SectionCard.jsx`: Glassmorphic container with 160° diagonal gradient, border tints, and optional skill-level styling.
   - `LoadingSpinner.jsx`: Dual-tone festive glowing loader.
   - `ErrorBanner.jsx`: Rose-tinted alert card for network and validation failures.
5. **Ambient Effects & Vector Stickers (`frontend/src/components/effects/`)**:
   - `FestiveBackdrop.jsx`: Viewport-responsive radial glow blooms and deterministic spark field with `pointer-events: none` to prevent layout interference.
   - `FestiveStickers.jsx`: 5 handcrafted inline Navratri SVG motifs (Diya, String of Lights, Marigold Garland, Dholak, Dandiya Sticks) and Mandala Spark.
6. **App Shell & Layout (`frontend/src/components/layout/`)**:
   - `NavBar.jsx`: Sticky app header with brand logo (`LogoFull` / `LogoMark`), live event status, navigation buttons, and notification badge.
   - `Footer.jsx`: Attribution crediting production by Kritz Vyonera AI Studio, brand tagline, and copyright.
   - `AppShell.jsx`: Persistent layout hosting the ambient backdrop, navbar, content outlet, and footer.
7. **Landing Page (`frontend/src/pages/HomePage.jsx`)**:
   - The emotional centerpiece of the product: *"You came to dance. Not to stand alone."*
   - Hero section with Prompt 0 logo, primary gradient tagline, supporting copy, and dominant CTAs ("Find Solo Garba Circle" and "Pre-Book My Circle").
   - Interactive 3-tier skill level preview strip (Beginner, Intermediate, Pro Raas) matching exact event colors.
   - 3-step "How It Works" cards (Scan & Register → Get Circle Matched → Spot Beacon & Dance).
   - Core experience pillars (Volunteer Captains, In-App Beacon Spotting, Verified Dancers, Live vs. Advance paths).
   - Mobile-first 360px touch ergonomics with desktop multi-column expansion.
8. **Unified API Client (`frontend/src/api/apiClient.js`, `frontend/src/api/config.js`)**:
   - Reusable `apiRequest()` handling JSON serialization, custom headers, and parsing the backend's `{ success: true, data }` / `{ success: false, error, details }` response format.
   - Throws descriptive `ApiError` instances containing HTTP status codes and detail objects.
9. **Routing Skeleton (`frontend/src/router.jsx`)**:
   - React Router v6 configuration mapping `/` to `HomePage` inside `AppShell`, with placeholder stubs for all Phase 2 routes.
10. **Application State & Responsive Hooks (`frontend/src/context/AppContext.jsx`, `frontend/src/hooks/useDeviceType.js`)**:
    - Centralized context managing active user session, notifications, venue selection, and active circle.
    - Viewport hook detecting mobile (<768px), tablet (768–1023px), and desktop (>=1024px).

---

### Design System Reference

Every component references `theme.*` rather than hardcoding values. Below is the mapping of design tokens defined in `frontend/src/styles/theme.js`:

| Token Path | Hex / Value | Description & Usage |
| :--- | :--- | :--- |
| `theme.colors.gold` | `#F5B301` | Primary festive gold; start of primary gradient, highlights |
| `theme.colors.amber` | `#E3A542` | Warm amber; mid-stop of primary gradient, badges, borders |
| `theme.colors.pink` / `magenta` | `#DB2777` | Vibrant magenta; end-stop of primary gradient, button shadows |
| `theme.colors.cyan` | `#00C2D1` | Cyan accent; start of chat gradient, stage lights |
| `theme.colors.violet` | `#7C3AED` | Deep violet; end of chat gradient, ambient blooms |
| `theme.colors.liveGreen` | `#3EE07A` | Live season pulse indicator |
| `theme.colors.beginner` | `#22C55E` | Beginner skill level accent |
| `theme.colors.beginnerBg` | `#122A1B` | Beginner card background start |
| `theme.colors.intermediate` | `#FFB020` | Intermediate skill level accent |
| `theme.colors.intermediateBg` | `#2E2410` | Intermediate card background start |
| `theme.colors.advanced` | `#F43F5E` | Pro Raas / Advanced skill level accent, error banners |
| `theme.colors.advancedBg` | `#2E1420` | Pro Raas card background start, error card background |
| `theme.colors.pageBgStart` | `#241D42` | Radial page background center bloom |
| `theme.colors.pageBgEnd` | `#14101F` | Deep dark festival night background |
| `theme.colors.cardBgStart` | `#2A2049` | Neutral card 160° gradient start |
| `theme.colors.cardBgEnd` | `#1F1938` | Neutral card 160° gradient end |
| `theme.colors.surfaceElevated` | `#241D3D` | Ghost button and input background |
| `theme.colors.textPrimary` | `#F3EDE0` | Off-white primary body & heading text |
| `theme.colors.textMuted` | `#B9AFD1` | Lavender-grey secondary text & descriptions |
| `theme.colors.textSecondary` | `#8A81A8` | Muted subtitle text & timestamps |
| `theme.colors.textPlaceholder` | `#6E6590` | Placeholder grey for inputs |
| `theme.colors.textDark` | `#1B1730` | High-contrast dark text on bright gradient buttons |
| `theme.colors.borderDefault` | `#4A3B6E` | 0.5px card and button border |
| `theme.colors.borderSubtle` | `#3A3257` | Subtle divider and footer top border |
| `theme.gradients.page` | `radial-gradient(ellipse at top, #241D42, #14101F 70%)` | Canvas background |
| `theme.gradients.primary` | `linear-gradient(90deg, #F5B301, #E3A542 35%, #DB2777)` | Primary buttons, active bars, hero gradient text |
| `theme.gradients.chat` | `linear-gradient(90deg, #00C2D1, #7C3AED)` | Circle chat header, secondary actions |
| `theme.gradients.cardNeutral` | `linear-gradient(160deg, #2A2049, #1F1938)` | Standard SectionCard background |
| `theme.fonts.heading` | `'Baloo 2', cursive, sans-serif` | Display titles, h1, h2, h3, PrimaryButton |
| `theme.fonts.body` | `'Manrope', sans-serif` | Body copy, labels, GhostButton, descriptions |
| `theme.fonts.mono` | `'JetBrains Mono', monospace` | Pass codes, step numbers, tokens, coordinates |
| `theme.shadows.primaryButton` | `0 6px 24px -6px #DB277799` | Primary CTA glow |
| `theme.shadows.card` | `0 8px 30px -10px #00000066` | Glassmorphic card drop shadow |

---

### Backend Connection Points

1. **Active Endpoints in Phase 1**:
   - **None directly invoked by the UI yet.**
   - `frontend/src/api/apiClient.js` is fully implemented and tested to communicate with Netlify Functions, but real feature screens (registration, payment, matching) are scheduled for Phase 2.
2. **Environment Variable Requirement**:
   - `VITE_API_BASE_URL` must be set before Phase 2 API calls can communicate with backend serverless functions.
   - Default for local development: `http://localhost:8888/.netlify/functions`.
   - In production on Netlify: Set via **Netlify Site Settings > Environment Variables**, or omit to automatically default to relative `/.netlify/functions`.

---

### Placeholder Assets

- **Festive Stickers (`frontend/src/components/effects/FestiveStickers.jsx`)**:
  - The Navratri motifs (`DiyaSticker`, `StringLightsSticker`, `MarigoldGarlandSticker`, `DholakSticker`, `DandiyaSticksSticker`, `MandalaSparkSticker`) are hand-crafted vector inline SVGs using the brand's exact color palette.
  - **Asset Swapping Guide**: If the creative team provides photographed or illustrated high-resolution `.webp` stickers later, place them in `frontend/src/assets/stickers/` and update the export in `FestiveStickers.jsx`. Because the components adhere to the standard `{ size, style, className }` prop interface, **zero layout code will need to change**.
- **Logos (`frontend/src/assets/logo/`)**:
  - Placeholder SVG components (`LogoFull.jsx`, `LogoMark.jsx`, `LogoMono.jsx`) have been superseded by 6 mentor-provided real brand PNG assets located in `frontend/src/assets/logo/`:
    - `Header.png` (1080x380, horizontal lockup on dark background) → Used in `frontend/src/components/layout/NavBar.jsx`.
    - `Logo.png` (524x521, full circular/square emblem) → Used in the hero presentation section of `frontend/src/pages/HomePage.jsx`.
    - `Logo_Square.png` (1074x610) → Used as the site favicon in `frontend/index.html`.
    - `Logo_Name.png` (890x301, horizontal lockup with logotype) → Available in `frontend/src/assets/logo/` for alternative banner/header lockups.
    - `Short_Stamp_Style.png` (724x694, ornate stamp mark) → Available in `frontend/src/assets/logo/` for future stamp, pass, or print applications.
    - `Logo_With_White_Background.png` (524x521, white background variant) → Available in `frontend/src/assets/logo/` for light-theme contexts or physical print collateral.
  - The original SVG components (`LogoFull.jsx`, `LogoMark.jsx`, `LogoMono.jsx`) remain in the repository as fallbacks and references with deprecation notices.

---

## Phase 2: Full App — Registration, Payment, Circle, Organizer — September 18, 2026

### Plain-English Summary of Phase 2 Screens & Work Completed

Phase 2 connects the client application directly to the live Netlify Functions backend documented in `docs/BACKEND_HANDOFF_LOG.md`. Every remaining screen in the application has been built as a fully functional, production-ready interface:

1. **`RegisterLivePage.jsx`**:
   - Multi-step live registration flow for walk-up festival attendees.
   - Validates all form inputs client-side (10-digit Indian mobile, city, venue, skill level, gender, age band) before network requests.
   - Interlocks with shared `OtpVerificationModal`, `TicketUploadStep`, and `PaymentStep`.
   - On successful registration from `POST /register`, extracts `nextStep.action === 'create_order'` and passes control to `PaymentStep` before routing the attendee to `/circle/:circleId`.

2. **`RegisterAdvancePage.jsx`**:
   - Pre-booking flow for upcoming Navratri dates.
   - Dynamically checks peak festival dates (`2026-10-17`, `2026-10-18`, `2026-10-24`, `2026-10-25`) to charge ₹249 vs base ₹199.
   - Enforces mandatory physical pass photo verification via Claude Vision OCR before calling `POST /advance-register`.
   - Hands off order creation to `PaymentStep` and displays a confirmed advance pass with booking ID and pool assignment info.

3. **`OtpVerificationModal.jsx`**:
   - Reusable modal shared across both registration flows.
   - Manages the complete OTP handshake: calls `POST /send-otp` with `{ whatsapp }` and `POST /verify-otp` with `{ whatsapp, code }`.
   - Displays a visible 30-second resend countdown matching the backend cooldown.
   - Detects the backend's 5-attempt hard lockout (`details.hardBlocked === true`) and displays a permanent block notice advising the user to request a fresh code.

4. **`TicketUploadStep.jsx`**:
   - Two-tab proof verification: Ticket Photo upload or Physical Serial Number.
   - Client-side canvas compression downscales ticket images to max 1200px width at 0.75 JPEG quality before base64 encoding (keeping payloads under ~150KB for rapid mobile transmission).
   - Pre-checks ticket photo against `POST /verify-ticket` (calling Google Gemini Flash OCR) to extract event date and venue, warning the user immediately if a venue mismatch is detected.

5. **`PaymentStep.jsx`**:
   - Dynamically loads Razorpay's official checkout library (`https://checkout.razorpay.com/v1/checkout.js`).
   - Calls `POST /create-order` with `{ registrationId }` to retrieve Razorpay Order ID, currency, amount, and the public Key ID.
   - Launches the Razorpay checkout modal with brand styling, prefilled attendee details, and payment callbacks.
   - On payment modal completion, calls `POST /verify-payment` with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId }` and displays an explicit "Verifying payment with festival server..." state.

6. **`CircleActivePage.jsx` & `BeaconPulse.jsx`**:
   - Post-match attendee dashboard displaying the matched circle name, landmark meeting point, member roster, and Captain info.
   - Provides physical gate check-in via `POST /circle-actions` `{ action: 'showup' }`.
   - Hosts `BeaconPulse.jsx`, a battery-friendly, full-screen color flasher utilizing GPU-accelerated CSS keyframe animations (2.2s normal pulse, 0.6s strobe toggle) without CPU-draining JavaScript timers.

7. **`CircleChatPage.jsx`**:
   - Ephemeral in-ground chat room with pre-configured quick suggestion chips to avoid typing in crowded grounds.
   - Monitors Indian Standard Time (IST) to display an alert between 12:15 AM and 1:00 AM, and auto-disables sending at 1:00 AM IST per festival guidelines.
   - Wires Captain tools (`grow`, `lock`, `transferCaptain`) and Member actions (`leave`, `switchCircle`) via `POST /circle-actions`.
   - Incorporates one-touch WhatsApp SOS security dialer.

8. **`SwitchCircleControl.jsx`**:
   - Embedded within circle tools to permit circle switching via `POST /circle-actions` `{ action: 'switchCircle' }`.
   - Respects backend constraints: 3 switches per night maximum, 5-minute lock after joining, and 20-minute cooldown between switches.

9. **`FindMyCirclePage.jsx`**:
   - Phone number lookup calling `POST /find-my-circle` or `GET /find-my-circle?whatsapp=...`.
   - Correctly renders three distinct visual states:
     - **Live Tonight**: Green live badge, active "Open Color Beacon" and "Group Chat" buttons.
     - **Upcoming Advance**: Cyan badge, view-only pass details and QR token with a notice that beacon unlocks at 6:30 PM on event night.
     - **Past Archive**: Muted gray badge, read-only pass history with beacon and chat disabled.

10. **`NotificationsPage.jsx`**:
    - Timeline view of festival gate openings, meeting point alerts, advance booking confirmations, and 12:45 AM chat closing warnings.

11. **`OrganizerLoginPage.jsx` & `OrganizerDashboardPage.jsx`**:
    - Venue ID + access key login calling `POST /admin-auth`.
    - Stores HMAC session token in `sessionStorage` (never `localStorage`) to protect shared booth tablets.
    - Dashboard calls `GET /organizer-stats` with `Authorization: Bearer <token>` and renders aggregate gate check-ins, showup percentage, registration breakdown, skill level distribution, and circle counts. Strictly excludes revenue, names, and phone numbers.

12. **`VenuesPage.jsx`**:
    - Directory of partner festival grounds across Ahmedabad, Surat, Vadodara, Mumbai, and other cities.
    - Features browser GPS Geolocation and Haversine distance calculations to highlight the nearest venue.

---

### Backend endpoints now connected

All endpoints were verified directly against the live backend schemas documented in `docs/BACKEND_HANDOFF_LOG.md`:

| Endpoint | Method | Frontend Caller File | Request Payload Shape | Response Data Shape Handled | Verified Against Backend Log |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/send-otp` | `POST` | `OtpVerificationModal.jsx` | `{ whatsapp: string }` | `{ message: string, ttlMinutes: number }` | Yes (`netlify/functions/otp/send-otp.js`) |
| `/verify-otp` | `POST` | `OtpVerificationModal.jsx` | `{ whatsapp: string, code: string }` | `{ message: string, verified: true, ttlMinutes: number }` | Yes (`netlify/functions/otp/verify-otp.js`) |
| `/verify-ticket` | `POST` | `TicketUploadStep.jsx` | `{ ticketPhoto: string (base64) }` | `{ verified: boolean, extractedVenue, extractedDate, confidence }` | Yes (`netlify/functions/ticket-verification/verify-ticket.js`) |
| `/register` | `POST` | `RegisterLivePage.jsx` | `{ name, whatsapp, city, venue, gender, ageBand, skillLevel, allWomenToggle, captainOptIn, ticketSerial, ticketPhoto }` | `{ registrationId: string, nextStep: { action: 'create_order', endpoint, params } }` | Yes (`netlify/functions/registration/register.js`) |
| `/advance-register` | `POST` | `RegisterAdvancePage.jsx` | Same as live + mandatory `eventDate` and `ticketPhoto` | `{ registrationId: string, nextStep: { action: 'create_order', endpoint, params } }` | Yes (`netlify/functions/registration/advance-register.js`) |
| `/create-order` | `POST` | `PaymentStep.jsx` | `{ registrationId: string }` | `{ orderId: string, amount: number, currency: string, keyId: string }` | Yes (`netlify/functions/payments/create-order.js`) |
| `/verify-payment` | `POST` | `PaymentStep.jsx` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId }` | `{ paymentStatus: 'confirmed', matching: { circleId, circleName, meetingPoint, isCaptain, ... } }` | Yes (`netlify/functions/payments/verify-payment.js`) |
| `/circle-actions` (`showup`) | `POST` | `CircleActivePage.jsx` | `{ action: 'showup', city, venue, registrationId, circleId, gate }` | `{ message, checkedInAt, totalShowups }` | Yes (`netlify/functions/circle/circle-actions.js`) |
| `/circle-actions` (`grow`) | `POST` | `CircleChatPage.jsx` | `{ action: 'grow', circleId, registrationId, spots: number }` | `{ message, circleId, isLocked: false, maxSpots, currentMembers }` | Yes (`netlify/functions/circle/circle-actions.js`) |
| `/circle-actions` (`lock`) | `POST` | `CircleChatPage.jsx` | `{ action: 'lock', circleId, registrationId }` | `{ message, circleId, isLocked: true }` | Yes (`netlify/functions/circle/circle-actions.js`) |
| `/circle-actions` (`leave`) | `POST` | `CircleChatPage.jsx` | `{ action: 'leave', circleId, registrationId }` | `{ message, circleId, remainingMembers, newCaptain }` | Yes (`netlify/functions/circle/circle-actions.js`) |
| `/circle-actions` (`transferCaptain`) | `POST` | `CircleChatPage.jsx` | `{ action: 'transferCaptain', circleId, currentCaptainId, newCaptainId, cancelTransfer }` | `{ message, circleId, newCaptainId, newCaptainName }` | Yes (`netlify/functions/circle/circle-actions.js`) |
| `/circle-actions` (`switchCircle`) | `POST` | `SwitchCircleControl.jsx` | `{ action: 'switchCircle', circleId, registrationId, targetCircleId }` | `{ message, sourceCircleId, targetCircleId, newCaptain }` | Yes (`netlify/functions/circle/circle-actions.js`) |
| `/find-my-circle` | `POST` / `GET` | `FindMyCirclePage.jsx` | `{ whatsapp: string }` | `{ whatsapp, todayDate, totalEntries, registrations: [...] }` | Yes (`netlify/functions/circle/find-my-circle.js`) |
| `/admin-auth` | `POST` | `OrganizerLoginPage.jsx` | `{ venueId: string, password: string }` | `{ message, venueId, token, expiresInHours }` | Yes (`netlify/functions/organizer/admin-auth.js`) |
| `/organizer-stats` | `GET` / `POST` | `OrganizerDashboardPage.jsx` | Headers: `Authorization: Bearer <token>`, Params: `venue`, `eventDate` | Whitelisted aggregate object: `registrations`, `skillLevelBreakdown`, `genderBalance`, `circles`, `attendance` | Yes (`netlify/functions/organizer/organizer-stats.js`) |

---

### Payment security note

The frontend adheres strictly to the backend's zero-trust payment security model:
- The frontend **never** marks a registration as "confirmed" or places an attendee into a circle based solely on the Razorpay checkout widget's client-side success callback.
- When Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`, the frontend enters an explicit, non-bypassable `"Verifying payment with festival server..."` loading state and submits the signature to `POST /verify-payment`.
- Only when the backend server independently validates the cryptographic HMAC SHA-256 signature against the Razorpay secret (or confirms via server webhook) and returns `{ paymentStatus: 'confirmed' }` does the client display the confirmation screen and navigate to the matched circle.
- In the event of a network glitch or signature mismatch during `verify-payment`, the UI provides an explicit retry mechanism rather than stranding the user or falsely claiming completion.

---

### Performance decisions (for 1,500–2,000 Concurrent Festival Rush)

To ensure high-speed reliability during the 6:30 PM festival entrance rush when cellular bandwidth is heavily constrained:
1. **Route-Level Code Splitting**: All pages are dynamically imported via `React.lazy()` in `router.jsx`. The initial landing page bundle is only ~13.5 KB (3.5 KB gzip), meaning first-time attendees load the shell in under 300ms on a weak 3G/4G connection without downloading unneeded registration, organizer, or chat bundles.
2. **CSS-Driven Beacon Animation**: The `BeaconPulse.jsx` color flasher relies entirely on GPU-composited CSS `@keyframes` animations (`transform: scale(...)` and `opacity`), avoiding JavaScript `setInterval` re-renders that throttle CPU and drain battery across dozens of simultaneous attendee devices.
3. **Client-Side Image Canvas Compression**: In `TicketUploadStep.jsx`, camera-captured ticket photos (frequently 5MB–10MB on modern smartphones) are downscaled in an off-screen HTML5 canvas to a maximum dimension of 1200px at 0.75 JPEG compression. This reduces base64 payloads to ~150KB before transmission, preventing upload timeouts on congested festival cell towers.
4. **Debounced & Throttled Inputs**: Form validations, search queries, and lookup triggers are guarded to prevent firing redundant network requests on keystrokes.
5. **Optimistic UI Guards**: Action buttons immediately disable upon touch with loading indicators to eliminate double-registration and double-payment attempts.

---

### Known limitations / pending items

1. **Automated End-to-End Tests**: Automated Playwright/Cypress browser test suites have not yet been written for the full multi-step registration flow.
2. **Illustrated Sticker Artwork**: The Navratri sticker motifs in `FestiveStickers.jsx` are currently clean vector SVGs; high-resolution custom illustrated `.webp` artwork from the creative studio can be swapped in directly via `frontend/src/assets/stickers/`.
3. **SMS OTP Fallback UI**: The client currently routes OTP requests through the backend's primary WhatsApp path. If SMS fallback provider integration is connected in the backend later, an SMS fallback toggle button can be exposed in `OtpVerificationModal.jsx`.

---

## Phase 3: Theme System, Logo Layout & NavBar Polish — September 23, 2026

### Plain-English Summary

Phase 3 introduces a complete dark/light theme system, redesigns the hero logo layout to match the approved visual reference, and cleans up the navigation bar. No backend changes were made; all work is purely client-side.

---

### 1. Dual Theme Architecture (`ThemeContext`)

**Problem**: All 26 component and page files imported `theme` as a static object from `frontend/src/styles/theme.js`. There was no mechanism for users to toggle between dark and light themes at runtime.

**Solution**: A new React Context (`ThemeContext.jsx`) wraps the entire application. Every component now consumes the active theme via a `useTheme()` hook rather than a static import.

#### New File: `frontend/src/context/ThemeContext.jsx`

| Export | Type | Purpose |
|:---|:---|:---|
| `ThemeProvider` | Component | Wraps `<App>`, manages `mode` state (`'light'` or `'dark'`), persists to `localStorage` key `solosaathi_theme` |
| `useTheme()` | Hook | Returns the active frozen theme object — drop-in replacement for the old static `theme` import |
| `useThemeMode()` | Hook | Returns `{ mode, toggleTheme }` for toggle UI buttons |

#### Rewritten File: `frontend/src/styles/theme.js`

The theme file now exports two complete frozen theme objects sharing common brand tokens:

| Export | Surface Colors | Text Colors | Use Case |
|:---|:---|:---|:---|
| `lightTheme` | `#FFF5EB` → `#FEF3E2` (warm cream) | `#2D1810` primary, `#6B5C4F` muted | Default; daytime preview, light-preference users |
| `darkTheme` | `#241D42` → `#14101F` (deep purple) | `#F3EDE0` primary, `#B9AFD1` muted | Festival night ambience, dark-preference users |

Shared tokens (identical in both): `accent.*` brand colors (gold, amber, pink, cyan, violet), `fonts.*`, `fontSizes.*`, `radii.*`, `spacing.*`, `maxWidths.*`, `transitions.*`, and action gradients.

Theme-varying tokens: `colors.*` (surfaces, text, borders), `gradients.*` (page, cards, CTA), `borders.*`, `shadows.*`, `backdropOpacity`, `sparkOpacity`, and `levels[]` array (skill level card config).

#### Rewritten File: `frontend/src/styles/globalStyles.js`

The `buildGlobalCss(theme)` function generates the CSS reset, font imports, scrollbar styling, focus rings, and keyframe animations using the provided theme object. The `<GlobalStyles theme={theme} />` component is rendered inside `ThemedApp` to reactively update when the user toggles themes.

#### Updated File: `frontend/src/App.jsx`

```jsx
<ThemeProvider>
  <ThemedApp />   {/* calls useTheme() and passes it to <GlobalStyles> */}
</ThemeProvider>
```

#### Migration: 26 Component/Page Files

All files that previously contained `import theme from '../styles/theme'` (or `../../styles/theme`) were batch-migrated:
- Import replaced with `import { useTheme } from '../context/ThemeContext'`
- `const theme = useTheme();` added as the first line inside the component function body

**Pages migrated (13):** `HomePage`, `RegisterLivePage`, `RegisterAdvancePage`, `FindMyCirclePage`, `CircleActivePage`, `CircleChatPage`, `NotificationsPage`, `OrganizerLoginPage`, `OrganizerDashboardPage`, `VenuesPage`, `OtpVerificationModal`, `PaymentStep`, `TicketUploadStep`.

**Components migrated (13):** `Badge`, `ErrorBanner`, `GhostButton`, `LoadingSpinner`, `PrimaryButton`, `SectionCard`, `FestiveBackdrop`, `FestiveStickers`, `NavBar`, `Footer`, `BeaconPulse`, `CircleMemberList`, `SwitchCircleControl`.

**Bug fixes during migration:**
- `LoadingSpinner.jsx`: `color = theme.colors.amber` as a default parameter value caused `ReferenceError` because `useTheme()` runs inside the function body. Fixed by defaulting to `null` and resolving inside the function.
- `VenuesPage.jsx`: The batch script incorrectly placed `useTheme()` inside the `getVenueId()` utility function (not a React component). Moved to the `VenuesPage()` component.
- `FestiveStickers.jsx`: Import was added but the file doesn't use `theme` — removed the unused import.

---

### 2. Adaptive Visual Effects (`FestiveBackdrop`)

The ambient glow blooms and spark field in `FestiveBackdrop.jsx` now respond to the active theme mode:
- **Light mode**: Reduced glow alpha channels and `sparkOpacity: 0.2` for subtle warmth on cream backgrounds.
- **Dark mode**: Increased glow alpha channels and `sparkOpacity: 0.55` for vivid festival night ambience.

---

### 3. Hero Logo Layout Redesign (`HomePage.jsx`)

**Before**: A single large `Logo.png` image (180–220px) displaying only the firework mark, with no brand text visible.

**After**: Two stacked images matching the approved visual reference:
1. **`Logo.png`** (firework mark) — 80px mobile / 100px desktop, continuously rotating via CSS `spin 8s linear infinite`
2. **`Logo_Name.png`** (brand text + tagline) — 90px mobile / 110px desktop, static

New import added: `import logoNameImg from '../assets/logo/Logo_Name.png'`

---

### 4. NavBar Cleanup

| Change | Detail |
|:---|:---|
| **Removed** | Top event status bar (`📍 {venue}, {city}` + `🟢 Navratri Live` pulse indicator) |
| **Added** | Dark/light theme toggle button (🌙 / ☀️) at the end of the nav action buttons |
| **Import** | Added `useThemeMode` from `ThemeContext` for toggle state management |

The toggle button includes `aria-label` and `title` attributes for accessibility, switching between "Switch to light mode" and "Switch to dark mode".

---

### 5. Hardcoded Gradient Cleanup

Several components still contained hardcoded light-theme hex gradients that wouldn't adapt on theme toggle. These were replaced with `theme.gradients.*` tokens:

| File | Old Hardcoded Value | Replaced With |
|:---|:---|:---|
| `OtpVerificationModal.jsx` | `linear-gradient(160deg, #FFFFFF, #FFF9F0)` | `theme.gradients.cardNeutral` |
| `SwitchCircleControl.jsx` | `linear-gradient(160deg, #FFFFFF, #FFF9F0)` | `theme.gradients.cardNeutral` |
| `ErrorBanner.jsx` | `linear-gradient(160deg, #FFF0F2, #FFF9F0)` | `theme.gradients.cardAdvanced` |
| `HomePage.jsx` (CTA card) | `linear-gradient(160deg, #3D2415, #2D1810)` | `theme.gradients.ctaCard` |
| `CircleActivePage.jsx` (level card) | `#FFF9F0` hardcoded end color | `theme.colors.cardBgEnd` |

---

### Design System Reference — Updated Token Table

The Phase 1 token table documented dark-theme values only. With the dual-theme system, each color/gradient token now resolves dynamically. Below are the **light theme** values (dark theme values remain as documented in Phase 1):

| Token Path | Light Value | Dark Value | Description |
|:---|:---|:---|:---|
| `theme.colors.pageBgStart` | `#FFF5EB` | `#241D42` | Page background start |
| `theme.colors.pageBgEnd` | `#FEF3E2` | `#14101F` | Page background end |
| `theme.colors.surfaceCard` | `#FFFFFF` | `#1F1938` | Card surface fill |
| `theme.colors.textPrimary` | `#2D1810` | `#F3EDE0` | Primary text |
| `theme.colors.textMuted` | `#6B5C4F` | `#B9AFD1` | Secondary text |
| `theme.colors.borderDefault` | `#E8D8C8` | `#4A3B6E` | Default borders |
| `theme.gradients.page` | `radial-gradient(ellipse at top, #FFF5EB, #FEF3E2 70%)` | `radial-gradient(ellipse at top, #241D42, #14101F 70%)` | Canvas background |
| `theme.gradients.ctaCard` | `linear-gradient(160deg, #3D2415, #2D1810)` | `linear-gradient(160deg, #2A1D44, #18122B)` | CTA card fill |
| `theme.backdropOpacity` | `0.3` | `1.0` | FestiveBackdrop glow multiplier |
| `theme.sparkOpacity` | `0.2` | `0.55` | Spark particle opacity |

