/**
 * @file netlify/shared/db.js
 * @description Firebase Firestore Database Layer for SoloSaathi Circle.
 *
 * Implements the 18 persistence functions required by the SoloSaathi Circle backend
 * using Firebase Cloud Firestore as the storage engine.
 *
 * Collection mapping follows the architecture defined in `docs/database.md`.
 * All functions are async and return Promises matching the contract shapes
 * specified in `docs/BACKEND_HANDOFF_LOG.md`.
 */

const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { OTP_VERIFIED_TTL_MINUTES } = require('./constants');
const { compositeKey: _compositeKey } = require('./keys');

// ---------------------------------------------------------------------------
// Firebase Admin Initialization (singleton, survives warm serverless starts)
// ---------------------------------------------------------------------------
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is missing.');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
  }
}

const db = getApps().length ? getFirestore() : null;

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Returns today's date in IST (UTC+5:30) as a 'YYYY-MM-DD' string.
 * Used by showups to derive the current event date automatically.
 *
 * @returns {string} Today's IST date.
 */
function _todayIST() {
  const now = new Date();
  // IST is UTC+5:30 → add 5.5 hours in ms
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Concurrency & Transaction Helpers (docs/database.md section 3)
// ---------------------------------------------------------------------------

/**
 * Executes a Firestore transaction callback.
 *
 * @param {Function} updateFn - Function taking (transaction) and returning a Promise.
 * @returns {Promise<*>} Resolves with the return value of updateFn.
 */
function runTransaction(updateFn) {
  if (!db) throw new Error('[db.runTransaction] Firestore is not initialized.');
  return db.runTransaction(updateFn);
}

/**
 * Creates and returns a Firestore WriteBatch.
 *
 * @returns {WriteBatch} Firestore WriteBatch instance.
 */
function runBatch() {
  if (!db) throw new Error('[db.runBatch] Firestore is not initialized.');
  return db.batch();
}

/**
 * Returns a DocumentReference for a given collection and docId.
 *
 * @param {string} collection - Collection name.
 * @param {string} docId - Document ID.
 * @returns {DocumentReference} Firestore DocumentReference.
 */
function getDocRef(collection, docId) {
  if (!db) throw new Error('[db.getDocRef] Firestore is not initialized.');
  return db.collection(collection).doc(docId);
}

/**
 * Exposes composite-key builder for pools collection.
 */
function getPoolDocId(city, venue, level, genderPref, eventDate) {
  return _compositeKey(city, venue, level, genderPref, eventDate);
}

/**
 * Exposes composite-key builder for groupstate collection.
 */
function getGroupStateDocId(city, venue, level, genderPref, date) {
  return _compositeKey(city, venue, level, genderPref, date);
}

/**
 * Exposes composite-key builder for showups collection.
 *
 * @param {string} city
 * @param {string} venue
 * @param {string} [date] - 'YYYY-MM-DD'; defaults to today's IST date.
 */
function getShowupDocId(city, venue, date) {
  return _compositeKey(city, venue, date || _todayIST());
}

// =========================================================================
// A. REGISTRATIONS  —  Collection: "registrations"
// =========================================================================

/**
 * Retrieves an attendee registration record by its unique ID.
 *
 * @param {string} id - Unique registration identifier (e.g., 'reg_live_abc123').
 * @returns {Promise<Object|null>} The registration document, or null if not found.
 */
async function getRegistration(id) {
  const doc = await db.collection('registrations').doc(id).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Saves or updates an attendee registration record.
 *
 * @param {string} id - Unique registration identifier.
 * @param {Object} registrationData - Full attendee registration payload and metadata.
 * @returns {Promise<Object>} The stored registration object.
 */
async function saveRegistration(id, registrationData) {
  await db.collection('registrations').doc(id).set(registrationData, { merge: true });
  return registrationData;
}

/**
 * Retrieves registrations associated with a mobile number.
 *
 * Two call modes:
 *  - **Single-date lookup** (existing callers unaffected):
 *      `getRegistrationsByMobile(whatsapp, date)` — pass a 'YYYY-MM-DD' date string to
 *      query with `whatsapp == whatsapp AND eventDate == date`. Useful for duplicate-
 *      registration checks on a specific night.
 *  - **All-dates lookup** (for cross-night portals such as find-my-circle):
 *      `getRegistrationsByMobile(whatsapp)` — omit (or pass null/undefined for) date to
 *      query with `whatsapp == whatsapp` only, returning every registration for that number
 *      across all past, present, and future event nights, ordered by eventDate descending
 *      (most recent first). Requires a single-field index on whatsapp in Firestore (created
 *      automatically); the orderBy adds eventDate descending (composite index on whatsapp
 *      ASC + eventDate DESC recommended in the Firebase Console).
 *
 * @param {string} whatsapp - Normalized 10-digit or E.164 mobile number.
 * @param {string} [date] - Optional event date in 'YYYY-MM-DD' format. Omit for all dates.
 * @returns {Promise<Array<Object>>} Array of matching registration objects.
 */
async function getRegistrationsByMobile(whatsapp, date) {
  let query = db.collection('registrations').where('whatsapp', '==', whatsapp);

  if (date) {
    // Single-date mode: equality filter on eventDate (original behaviour).
    query = query.where('eventDate', '==', date);
  } else {
    // All-dates mode: no eventDate filter; order most recent first.
    query = query.orderBy('eventDate', 'desc');
  }

  const snapshot = await query.get();
  if (snapshot.empty) return [];
  return snapshot.docs.map((doc) => doc.data());
}

// =========================================================================
// B. PENDING POOLS  —  Collection: "pools"
// =========================================================================

/**
 * Retrieves the pending pool queue for a specific matching partition.
 *
 * @param {string} city - City name (e.g., 'Ahmedabad').
 * @param {string} venue - Venue name (e.g., 'United Way Garba Grounds').
 * @param {string} level - Skill level ('beginner', 'intermediate', 'advanced').
 * @param {string} genderPref - Circle preference ('mixed' or 'allWomen').
 * @param {string} eventDate - Event date in 'YYYY-MM-DD' format.
 * @returns {Promise<Array<Object>>} Array of attendee objects waiting in the queue.
 */
async function getPendingPool(city, venue, level, genderPref, eventDate) {
  const docId = _compositeKey(city, venue, level, genderPref, eventDate);
  const doc = await db.collection('pools').doc(docId).get();
  return doc.exists ? (doc.data().poolArray || []) : [];
}

/**
 * Persists the pending matching pool queue for a specific matching partition.
 *
 * @param {string} city - City name.
 * @param {string} venue - Venue name.
 * @param {string} level - Skill level.
 * @param {string} genderPref - Circle preference ('mixed' or 'allWomen').
 * @param {string} eventDate - Event date in 'YYYY-MM-DD' format.
 * @param {Array<Object>} poolArray - Updated queue of attendee objects.
 * @returns {Promise<Array<Object>>} Stored pool array.
 */
async function savePendingPool(city, venue, level, genderPref, eventDate, poolArray) {
  const docId = _compositeKey(city, venue, level, genderPref, eventDate);
  await db.collection('pools').doc(docId).set({ poolArray }, { merge: true });
  return poolArray;
}

// =========================================================================
// C. GROUP STATE  —  Collection: "groupstate"
// =========================================================================

/**
 * Retrieves the high-level group state tracking circle partitions for a venue partition tonight.
 *
 * @param {string} city - City name.
 * @param {string} venue - Venue name.
 * @param {string} level - Skill level.
 * @param {string} genderPref - Circle preference ('mixed' or 'allWomen').
 * @param {string} date - Event date in 'YYYY-MM-DD' format.
 * @returns {Promise<Object|null>} Group partition state or null if not yet initialized.
 */
async function getGroupState(city, venue, level, genderPref, date) {
  const docId = _compositeKey(city, venue, level, genderPref, date);
  const doc = await db.collection('groupstate').doc(docId).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Persists the high-level group partition state for a venue partition.
 *
 * @param {string} city - City name.
 * @param {string} venue - Venue name.
 * @param {string} level - Skill level.
 * @param {string} genderPref - Circle preference ('mixed' or 'allWomen').
 * @param {string} date - Event date in 'YYYY-MM-DD' format.
 * @param {Object} stateObject - Group state object containing active circle IDs and counters.
 * @returns {Promise<Object>} Stored group state object.
 */
async function saveGroupState(city, venue, level, genderPref, date, stateObject) {
  const docId = _compositeKey(city, venue, level, genderPref, date);
  await db.collection('groupstate').doc(docId).set(stateObject, { merge: true });
  return stateObject;
}

// =========================================================================
// D. CIRCLES  —  Collection: "circles"
// =========================================================================

/**
 * Retrieves the complete operational state of a single Circle by its ID.
 *
 * @param {string} circleId - Unique circle identifier (e.g., 'circle_garba_toli_01').
 * @returns {Promise<Object|null>} Circle state object (members, captain, status, chatLink), or null.
 */
async function getCircleState(circleId) {
  const doc = await db.collection('circles').doc(circleId).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Retrieves a circle, following `mergedInto` when it was merged into another circle
 * (see netlify/shared/advance-circles.js), so old links land on the circle people are in now.
 *
 * @param {string} circleId - Circle ID, possibly of a merged circle.
 * @returns {Promise<Object|null>} The current circle state, or null.
 */
async function getCurrentCircleState(circleId) {
  let circle = await getCircleState(circleId);
  for (let hops = 0; circle && circle.status === 'merged' && circle.mergedInto && hops < 5; hops++) {
    circle = await getCircleState(circle.mergedInto);
  }
  return circle;
}

/**
 * Persists the state of a single Circle.
 *
 * @param {string} circleId - Unique circle identifier.
 * @param {Object} stateObject - Complete circle state payload.
 * @returns {Promise<Object>} Stored circle state object.
 */
async function saveCircleState(circleId, stateObject) {
  await db.collection('circles').doc(circleId).set(stateObject, { merge: true });
  return stateObject;
}

// =========================================================================
// E. VENUE SHOWUPS  —  Collection: "showups"
// =========================================================================

/**
 * Retrieves the attendee check-in / venue showup list for a venue and night.
 *
 * @param {string} city - City name.
 * @param {string} venue - Venue name.
 * @param {string} [date] - Event date 'YYYY-MM-DD'; defaults to today's IST date.
 * @returns {Promise<Array<Object>>} List of attendee check-in records.
 */
async function getShowups(city, venue, date) {
  const docId = getShowupDocId(city, venue, date);
  const doc = await db.collection('showups').doc(docId).get();
  return doc.exists ? (doc.data().showupsArray || []) : [];
}

/**
 * Persists attendee check-in records for a venue and night.
 *
 * @param {string} city - City name.
 * @param {string} venue - Venue name.
 * @param {Array<Object>} showupsArray - Array of verified check-in records.
 * @param {string} [date] - Event date 'YYYY-MM-DD'; defaults to today's IST date.
 * @returns {Promise<Array<Object>>} Stored showups array.
 */
async function saveShowups(city, venue, showupsArray, date) {
  const docId = getShowupDocId(city, venue, date);
  await db.collection('showups').doc(docId).set({ showupsArray }, { merge: true });
  return showupsArray;
}

// =========================================================================
// F. OTP RECORDS  —  Collection: "otp"
// =========================================================================

/**
 * Retrieves the current OTP record for a mobile number.
 *
 * @param {string} whatsapp - Normalized mobile phone number.
 * @returns {Promise<{code: string, expiresAt: number, attempts: number, createdAt: number}|null>}
 */
async function getOtpRecord(whatsapp) {
  const doc = await db.collection('otp').doc(whatsapp).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Saves or overwrites the active OTP record for a mobile phone number.
 *
 * @param {string} whatsapp - Normalized mobile phone number.
 * @param {Object} otpData - Object containing code, expiresAt, attempts, createdAt.
 * @returns {Promise<Object>} Stored OTP data.
 */
async function saveOtpRecord(whatsapp, otpData) {
  await db.collection('otp').doc(whatsapp).set(otpData);
  return otpData;
}

// =========================================================================
// F. OTP RATE LIMITING  —  Collection: "otplimit"
// =========================================================================

/**
 * Retrieves OTP rate-limiting state for a mobile phone number.
 *
 * @param {string} whatsapp - Normalized mobile phone number.
 * @returns {Promise<{count: number, windowStartTime: number, lastSentAt: number}|null>}
 */
async function getOtpRateLimit(whatsapp) {
  const doc = await db.collection('otplimit').doc(whatsapp).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Saves OTP rate-limiting state for a mobile phone number.
 *
 * @param {string} whatsapp - Normalized mobile phone number.
 * @param {Object} rateLimitData - Rate limit tracker object.
 * @returns {Promise<Object>} Stored rate limit data.
 */
async function saveOtpRateLimit(whatsapp, rateLimitData) {
  await db.collection('otplimit').doc(whatsapp).set(rateLimitData);
  return rateLimitData;
}

// =========================================================================
// F. VERIFIED SESSION STATUS  —  Collection: "verified"
// =========================================================================

/**
 * Retrieves the verified session status for a mobile phone number.
 *
 * @param {string} whatsapp - Normalized mobile phone number.
 * @returns {Promise<{verified: boolean, verifiedAt: number, expiresAt: number}|null>}
 */
async function getVerifiedStatus(whatsapp) {
  const doc = await db.collection('verified').doc(whatsapp).get();
  if (!doc.exists) return null;

  const data = doc.data();
  // If the 30-minute verified session has expired, treat as not verified
  if (data.expiresAt && Date.now() > data.expiresAt) {
    return null;
  }
  return data;
}

/**
 * Saves verified session status for a mobile phone number.
 * Automatically computes the 30-minute expiry window from the provided timestamp.
 *
 * @param {string} whatsapp - Normalized mobile phone number.
 * @param {number} timestamp - Epoch millisecond timestamp when OTP verification succeeded.
 * @returns {Promise<Object>} Stored verified session status object.
 */
async function saveVerifiedStatus(whatsapp, timestamp) {
  const verifiedData = {
    verified: true,
    verifiedAt: timestamp,
    expiresAt: timestamp + OTP_VERIFIED_TTL_MINUTES * 60 * 1000,
  };
  await db.collection('verified').doc(whatsapp).set(verifiedData);
  return verifiedData;
}

// =========================================================================
// G. VENUES CONFIGURATION  —  Collection: "config", Document: "venues"
// =========================================================================

/**
 * Retrieves the configured list and metadata of participating Garba festival venues.
 *
 * @returns {Promise<Object<string, Array<{name: string, lat: number, lng: number}>>|Array<Object>>}
 */
async function getVenues() {
  const doc = await db.collection('config').doc('venues').get();
  return doc.exists ? doc.data() : {};
}

// =========================================================================
// H. ORGANIZER ACCOUNTS  —  Collection: "organizers", Document ID: venue ID (upper case)
// =========================================================================

/**
 * Retrieves a venue organizer account.
 *
 * @param {string} venueId - Venue ID, e.g. 'AH-UNIT' (case-insensitive).
 * @returns {Promise<{venueId: string, city: string, venue: string, passwordHash: string, salt: string, disabled?: boolean}|null>}
 */
async function getOrganizer(venueId) {
  const doc = await db.collection('organizers').doc(String(venueId).trim().toUpperCase()).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Creates or updates a venue organizer account (see scripts/create-organizer.js).
 *
 * @param {string} venueId - Venue ID (stored upper case).
 * @param {Object} data - Account fields.
 * @returns {Promise<Object>} Stored account.
 */
async function saveOrganizer(venueId, data) {
  const id = String(venueId).trim().toUpperCase();
  await db.collection('organizers').doc(id).set({ ...data, venueId: id }, { merge: true });
  return data;
}

// =========================================================================
// EXPORTS
// =========================================================================

module.exports = {
  db,
  FieldValue,
  runTransaction,
  runBatch,
  getDocRef,
  getPoolDocId,
  getGroupStateDocId,
  getShowupDocId,
  getRegistration,
  saveRegistration,
  getRegistrationsByMobile,
  getPendingPool,
  savePendingPool,
  getGroupState,
  saveGroupState,
  getCircleState,
  getCurrentCircleState,
  saveCircleState,
  getShowups,
  saveShowups,
  getOtpRecord,
  saveOtpRecord,
  getOtpRateLimit,
  saveOtpRateLimit,
  getVerifiedStatus,
  saveVerifiedStatus,
  getVenues,
  getOrganizer,
  saveOrganizer,
};

