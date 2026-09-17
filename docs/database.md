# SoloSaathi Circle — Firebase Database Handoff & Architecture

## Overview

This document outlines the approach for building the persistence layer of the **SoloSaathi Circle** backend using **Firebase Cloud Firestore** instead of Netlify Blobs. 

Firestore is a NoSQL document database built for automatic scaling, high performance, and ease of application development. This document specifies how the 18 interface methods defined in `netlify/shared/db.js` will map to Firestore collections, documents, and operations.

The backend will use the `firebase-admin` Node.js SDK to interact with Firestore from within the Netlify serverless functions.

---

## 1. Firebase Setup & Authentication

To interact with Firebase from our Netlify environment:
1. We have a Firebase Project created (`solosaathi-circle`).
2. The Service Account JSON has been minified and provided to the environment via the `.env` file as `FIREBASE_SERVICE_ACCOUNT`.
3. `netlify/shared/db.js` initializes the `firebase-admin` SDK on cold start, utilizing a check (`!admin.apps.length`) to prevent re-initializing during warm serverless starts.
4. The initialized `db` (Firestore instance) is exported for use by other functions.

---

## 2. Firestore Data Model Mapping

Firestore organizes data into collections of documents. Unlike Netlify Blobs where we had arbitrary key-value paths (like `registrations:{id}`), we will map these into specific Collections and Document IDs.

### A. Registrations Collection
- **Collection Name**: `registrations`
- **Document ID**: The registration `id` (e.g., `reg_live_9876543210_1729000000`)
- **Indexes**: 
  - We will need a composite index on `(whatsapp, eventDate)` to efficiently support the `getRegistrationsByMobile` query.

**Functions Mapped**:
* `getRegistration(id)`: Reads document from `registrations/{id}`.
* `saveRegistration(id, registrationData)`: Uses `set()` with `{ merge: true }` on `registrations/{id}`.
* `getRegistrationsByMobile(whatsapp, date)`: Uses `where("whatsapp", "==", whatsapp).where("eventDate", "==", date).get()` on the `registrations` collection.

### B. Pending Pools Collection
- **Collection Name**: `pools`
- **Document ID**: Composite key derived from the partition constraints. 
  Format: `{city}_{venue}_{level}_{genderPref}_{eventDate}`. (Spaces in venue names should be replaced with underscores or slugified).
- **Structure**: The document will contain a single field `poolArray` holding the array of queued attendee objects.

**Functions Mapped**:
* `getPendingPool(...)`: Reads document using the composite ID and returns the `poolArray` field (or `[]` if it doesn't exist).
* `savePendingPool(...)`: Uses `set({ poolArray }, { merge: true })` on the corresponding document.

*(Note: Firestore documents have a 1MB size limit. For festival pooling, an array of a few hundred queued attendee objects will easily fit well within this limit).*

### C. Group State Collection
- **Collection Name**: `groupstate`
- **Document ID**: Composite key: `{city}_{venue}_{level}_{genderPref}_{date}`
- **Structure**: Contains active circle IDs, counters, etc.

**Functions Mapped**:
* `getGroupState(...)`: Reads document from `groupstate/{composite_id}`.
* `saveGroupState(...)`: Updates document at `groupstate/{composite_id}`.

### D. Circles Collection
- **Collection Name**: `circles`
- **Document ID**: `circleId` (e.g., `circle_taal_toli_04`)

**Functions Mapped**:
* `getCircleState(circleId)`: Reads document from `circles/{circleId}`.
* `saveCircleState(circleId, stateObject)`: Uses `set()` on `circles/{circleId}`.

### E. Venue Showups Collection
- **Collection Name**: `showups`
- **Document ID**: Composite key: `{city}_{venue}_{current_date}`
- **Structure**: Contains a `showupsArray` field to track all check-in events.

**Functions Mapped**:
* `getShowups(city, venue)`: Reads document and returns `showupsArray`.
* `saveShowups(city, venue, showupsArray)`: Updates document with new array.

### F. Authentication & OTP Tracking (Ephemeral Data)
These documents map to WhatsApp numbers. In Firestore, documents persist forever unless deleted. We can use [Firebase TTL (Time-To-Live) policies](https://firebase.google.com/docs/firestore/ttl) to automatically purge expired OTP and verification records to save cost and maintain privacy.

#### OTP Records
- **Collection Name**: `otp`
- **Document ID**: `whatsapp`
- **Functions**: 
  - `getOtpRecord(whatsapp)`
  - `saveOtpRecord(whatsapp, otpData)`
- **TTL**: We should add a TTL policy based on the `expiresAt` timestamp field.

#### OTP Rate Limiting
- **Collection Name**: `otplimit`
- **Document ID**: `whatsapp`
- **Functions**:
  - `getOtpRateLimit(whatsapp)`
  - `saveOtpRateLimit(whatsapp, rateLimitData)`

#### Verified Session Status
- **Collection Name**: `verified`
- **Document ID**: `whatsapp`
- **Functions**:
  - `getVerifiedStatus(whatsapp)`
  - `saveVerifiedStatus(whatsapp, timestamp)`
- **TTL**: We should add a TTL policy to expire these documents based on the 30-minute verified session window.

### G. Venues Configuration
- **Collection Name**: `config`
- **Document ID**: `venues`
- **Structure**: Can be stored as a single document mapping city names to arrays of venue objects.

**Functions Mapped**:
* `getVenues()`: Reads from `config/venues`. (Alternatively, this could just remain a hardcoded constant in code to save database reads, depending on how often venues are added).

---

## 3. Firestore Concurrency & Transactions

One distinct advantage of Firestore over simple Blob storage is its robust support for Atomic Transactions.
As the Matching Engine (`netlify/shared/matching.js`) reads group states and writes new circles concurrently, we can run into race conditions if 100 people register at the exact same millisecond.

While `db.js` exposes simple get/save methods, we will enhance the implementation of `savePendingPool`, `saveGroupState`, and `saveRegistration` to utilize **Firestore Transactions (`db.runTransaction`)** or **Batched Writes** for atomic matching guarantees. 

For instance, when a circle is formed:
1. Remove attendees from `pools`
2. Update `groupstate` counters
3. Create new `circles` document
4. Update `registrations` with their new `circleId`

All of these can be wrapped in a single Firestore Batch Write to guarantee that no attendee is ever left in a broken state if the serverless function crashes halfway through.

---

## 4. Implementation Steps for the Database Teammate

1. **Initialize Firebase Admin**:
   Create a single Firebase Admin app instance that is shared across function invocations to maintain connection pooling.
2. **Implement the 18 Stubs**:
   Replace the `throw new Error("NOT_IMPLEMENTED...")` lines in `netlify/shared/db.js` with `firebase-admin` Firestore calls mapping to the collections outlined above.
3. **Configure TTL Indexes**:
   In the Firebase Console, set up TTL (Time-To-Live) indexes for the `otp` and `verified` collections to auto-delete documents when their timestamps expire.
4. **Configure Composite Indexes**:
   In the Firebase Console, create a composite index for `registrations` on the fields `whatsapp` (Ascending) and `eventDate` (Ascending).

By following this approach, the existing Phase 2 and Phase 3 logic will require **zero changes**, and we will benefit from a robust, scalable backend for the Navratri season.
