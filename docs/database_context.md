# SoloSaathi Circle — Database Setup Context Log

> **Branch**: `database-setup`  
> **Date**: 2026-09-17  
> **Status**: ✅ Core database setup complete

---

## What Was Done

### Task 1: Secure Environment Setup

1. Received the Firebase Service Account JSON for project `solosaathi-circle`.
2. Minified the entire JSON into a single-line string using a Node.js script.
3. Created a `.env` file in the project root with the credential stored as:
   ```
   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"solosaathi-circle",...}'
   ```
4. Verified `.gitignore` already contains `.env` — credentials will never be committed.

---

### Task 2: Firebase Admin Initialization

**File**: `netlify/shared/db.js`

- Imported `firebase-admin` v14 using the **modular API**:
  ```js
  const { getApps, initializeApp, cert } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  ```
- Added singleton initialization with `getApps().length` check to prevent re-initializing during warm serverless starts.
- Exported the `db` (Firestore instance) for use by all other backend functions.
- Added graceful fallback: if `FIREBASE_SERVICE_ACCOUNT` env var is missing, `db` resolves to `null` and a warning is logged.

---

### Task 3: Dependencies

- No `package.json` existed in the project root — created one via `npm init -y`.
- Installed `firebase-admin` (v14.4.0) as a dependency.
- `package-lock.json` generated and committed.

---

### Task 4: Implement All 18 Database Stub Functions

Replaced every `throw new Error("NOT_IMPLEMENTED...")` in `netlify/shared/db.js` with concrete Firestore operations. The implementation follows the architecture defined in `docs/database.md`.

#### Firestore Collections & Function Mapping

| # | Collection | Document ID Strategy | Functions |
|:--|:-----------|:---------------------|:----------|
| A | `registrations` | Registration `id` (e.g., `reg_live_9876543210_1729000000`) | `getRegistration(id)`, `saveRegistration(id, data)`, `getRegistrationsByMobile(whatsapp, date)` |
| B | `pools` | Composite: `{city}_{venue}_{level}_{genderPref}_{eventDate}` | `getPendingPool(...)`, `savePendingPool(...)` |
| C | `groupstate` | Composite: `{city}_{venue}_{level}_{genderPref}_{date}` | `getGroupState(...)`, `saveGroupState(...)` |
| D | `circles` | `circleId` (e.g., `circle_taal_toli_04`) | `getCircleState(circleId)`, `saveCircleState(circleId, state)` |
| E | `showups` | Composite: `{city}_{venue}_{today_IST_date}` | `getShowups(city, venue)`, `saveShowups(city, venue, array)` |
| F | `otp` | WhatsApp number | `getOtpRecord(whatsapp)`, `saveOtpRecord(whatsapp, otpData)` |
| F | `otplimit` | WhatsApp number | `getOtpRateLimit(whatsapp)`, `saveOtpRateLimit(whatsapp, data)` |
| F | `verified` | WhatsApp number | `getVerifiedStatus(whatsapp)`, `saveVerifiedStatus(whatsapp, timestamp)` |
| G | `config` | `venues` (static document) | `getVenues()` |

#### Internal Helper Functions Added

| Helper | Purpose |
|:-------|:--------|
| `_slugify(str)` | Converts multi-word strings to key-safe slugs (e.g., `"United Way Garba Grounds"` → `"united_way_garba_grounds"`) |
| `_compositeKey(...parts)` | Builds Firestore document IDs from partition parameters by slugifying and joining |
| `_todayIST()` | Returns current IST date as `YYYY-MM-DD` string for showup partitioning |

#### Key Implementation Details

- **`saveRegistration`** uses `set()` with `{ merge: true }` for upsert behavior.
- **`getRegistrationsByMobile`** uses a Firestore composite `where()` query (requires a composite index).
- **`getVerifiedStatus`** checks `expiresAt` against `Date.now()` and returns `null` if the 30-minute session has expired, even if the document still exists in Firestore.
- **`saveVerifiedStatus`** auto-computes the expiry window using `OTP_VERIFIED_TTL_MINUTES` (30 min) from `constants.js`.
- **Pools and Showups** store arrays inside a single document field (`poolArray` / `showupsArray`).

---

### Task 5: Documentation

- **`docs/database.md`** — Created the full Firestore architecture document covering:
  - Collection design and document ID strategies
  - Composite key patterns
  - TTL policy recommendations
  - Composite index requirements
  - Concurrency strategy (Firestore Transactions & Batched Writes)
- Updated the Firebase Setup section in `database.md` to reflect the actual implementation (project name, env var name, initialization pattern).

---

## Git History

```
007dca0 feat: setup firebase admin and environment variables
5f46de7 feat: implement firestore database collections and v14 modular API
```

Branch pushed to `origin/database-setup`.

---

## Verification Results

- ✅ `db.js` loads and parses without errors
- ✅ Firestore instance initializes successfully when `FIREBASE_SERVICE_ACCOUNT` is provided
- ✅ Graceful `null` fallback when env var is missing (no crash)
- ✅ All 18 functions exported and match the contract in `BACKEND_HANDOFF_LOG.md`
- ✅ Zero changes required in any Phase 2 consuming modules

---

## Remaining Manual Steps (Firebase Console / Deployment)

These cannot be done from code and must be completed before production:

| # | Task | Where | Status |
|:--|:-----|:------|:-------|
| 1 | Create composite index on `registrations` (`whatsapp` Asc + `eventDate` Asc) | Firebase Console → Firestore → Indexes | ⬜ Pending |
| 2 | Configure TTL policy on `otp` collection (field: `expiresAt`) | Firebase Console → Firestore → TTL Policies | ⬜ Pending |
| 3 | Configure TTL policy on `verified` collection (field: `expiresAt`) | Firebase Console → Firestore → TTL Policies | ⬜ Pending |
| 4 | Seed `config/venues` document with venue catalog | Firebase Console → Firestore → Data | ⬜ Pending |
| 5 | Add `FIREBASE_SERVICE_ACCOUNT` to Netlify env vars | Netlify Dashboard → Site → Environment Variables | ⬜ Pending |

---

## Files Modified / Created

| File | Action | Description |
|:-----|:-------|:------------|
| `.env` | Created | Contains minified Firebase Service Account JSON |
| `package.json` | Created | Node.js project manifest with `firebase-admin` dependency |
| `package-lock.json` | Created | Dependency lockfile |
| `netlify/shared/db.js` | Modified | Replaced 18 stubs with Firestore implementations |
| `docs/database.md` | Created | Firestore architecture and migration guide |
