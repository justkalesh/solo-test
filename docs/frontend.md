# SoloSaathi Circle — Frontend Build Log

## Phase 1: Foundation, Design System & Landing Page — September 18, 2026

### 1. Plain-English Summary

Phase 1 establishes the production-grade frontend architecture for **SoloSaathi Circle**, a real-time festival companion platform by Kritz Vyonera AI Private Limited designed to group solo Garba/Navratri attendees into balanced, Captain-led dance circles.

The backend (a suite of Netlify serverless functions covering phone OTP authentication, Anthropic Claude Vision AI ticket verification (`verify-ticket.js`), circle formation, live circle chat, organizer portal, and Razorpay payment orders) is already complete in `netlify/functions/`. During Phase 1, **no backend code was altered**. Instead, this phase delivered the complete client-side scaffold, design system primitives, routing structure, unified API client, ambient visual effects, and a production landing page.

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
  - `LogoFull.jsx`, `LogoMark.jsx`, `LogoMono.jsx` were imported directly from Prompt 0 and integrated into the `NavBar`, `HomePage`, and `index.html`.

---

### Not Built Yet (Deferred to Phase 2)

The following feature flows and screens are stubbed in `frontend/src/router.jsx` and will be implemented in Phase 2:
1. **Live Walk-Up Registration Flow (`/register`)**:
   - Multi-step form: city & venue selection, GPS proximity nudge, skill level selection, dancer name & WhatsApp number.
2. **Phone OTP Verification UI**:
   - 6-digit numeric input with countdown resend timer calling `auth/send-otp` and `auth/verify-otp`.
3. **AI Ticket Verification Upload (`tickets/verify`)**:
   - Drag-and-drop / camera pass upload sending ticket images to Anthropic Claude Vision (`verify-ticket.js`) for automated venue and date extraction.
4. **Advance Registration & Pre-Booking (`/advance`)**:
   - Date selection for peak nights (Oct 17, 18, 24, 25) with dynamic pricing (₹199 base vs ₹249 peak).
5. **Razorpay Live-Mode Payment Integration**:
   - Seamless checkout invoking `payments/create-order` and verifying signatures via `payments/verify-payment`.
6. **Circle Room & Matching View (`/circle/:circleId`)**:
   - Active circle dashboard showing matched members, gender balance, and Captain card.
7. **Circle Beacon Screen**:
   - Full-screen color-pulsing beacon with fast/slow cycle toggle for spotting group members across crowded grounds.
8. **Circle Chat & Quick Actions**:
   - Synchronized group chat with pre-written quick chips ("📍 At the anchor!", "🪩 Holding up my beacon!"), profanity filter, and WhatsApp SOS link.
9. **Find My Circle Lookup (`/find-circle`)**:
   - Retrieval flow via phone number OTP or ticket code for returning attendees.
10. **Notifications View (`/notifications`)**:
    - Day-before, day-of, and post-event attendance confirmation prompts.
11. **Organizer Dashboard (`/organizer`)**:
    - Venue-specific passcode authentication, live check-in counters, bucket finalization, and attendance statistics.
12. **Switch Circle / Re-Balancing UI**:
    - Re-assignment requests if a circle member wishes to change skill levels.
