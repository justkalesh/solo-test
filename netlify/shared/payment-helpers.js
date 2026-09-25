/**
 * @file netlify/shared/payment-helpers.js
 * @description Shared Payment & Matching Helpers for SoloSaathi Circle Phase 3.
 *
 * Implements:
 * - `joinMatchingBucket`: Decoupled matching engine entry point called only AFTER payment
 *   confirmation (used by both verify-payment.js and webhook.js). Idempotent to prevent
 *   duplicate circle allocations or pool duplicates on webhook retries or concurrent calls.
 * - `maskSecret`: Security utility masking all but the last 4 characters of sensitive keys
 *   in debug and failure logs.
 */

const { shouldStartNewBucket, checkGenderCap } = require('./matching');
const {
  createCircleState,
  toCircleMember,
  adjustGenderCount,
  circleSummary,
} = require('./circles');
const db = require('./db');

/**
 * Masks a sensitive credential string for safe logging.
 * Retains only the last 4 characters, masking all preceding characters with '*'.
 *
 * @param {string} secret - The secret string to mask.
 * @returns {string} Masked string (e.g., '****************4a2f').
 */
function maskSecret(secret) {
  if (!secret || typeof secret !== 'string') return '[UNSET]';
  if (secret.length <= 4) return '****';
  return '*'.repeat(secret.length - 4) + secret.slice(-4);
}

/**
 * Places a paid attendee into their corresponding matching bucket (Live Circle or Advance Pool).
 * This function is strictly idempotent:
 * - For Live registrations: checks if a circleId is already assigned; if so, returns existing state.
 * - For Advance registrations: checks if the registration ID already exists in the pending pool;
 *   if so, returns existing pool state without creating duplicates.
 *
 * @param {Object} registration - Confirmed registration document from Firestore.
 * @returns {Promise<Object>} Assignment result payload containing matching metadata.
 */
async function joinMatchingBucket(registration) {
  if (!registration || typeof registration !== 'object') {
    throw new Error('[joinMatchingBucket] Invalid registration payload provided.');
  }

  const now = Date.now();
  const registrationType = registration.registrationType || 'live';
  const genderPref = registration.allWomenToggle ? 'allWomen' : 'mixed';
  const level = registration.skillLevel || 'beginner';
  const eventDate = registration.eventDate;
  const city = registration.city;
  const venue = registration.venue;

  // -------------------------------------------------------------------------
  // 1. LIVE REGISTRATION MATCHING
  // -------------------------------------------------------------------------
  if (registrationType === 'live') {
    // Fast idempotency path (duplicate webhook / verify-payment call)
    if (registration.circleId) {
      const existingCircle = await db.getCircleState(registration.circleId);
      if (existingCircle) {
        return {
          success: true,
          type: 'live',
          circleId: registration.circleId,
          circle: circleSummary(existingCircle, registration.id),
          alreadyJoined: true,
        };
      }
    }

    return await db.runTransaction(async (transaction) => {
      const groupStateRef = db.getDocRef(
        'groupstate',
        db.getGroupStateDocId(city, venue, level, genderPref, eventDate)
      );
      const groupStateDoc = await transaction.get(groupStateRef);
      const groupState = groupStateDoc.exists ? groupStateDoc.data() : null;

      let activeCircleId = groupState?.activeCircleId || null;
      let circleCounter = groupState?.lastCircleCounter || 0;
      let circleState = null;
      let circleRef = null;

      if (activeCircleId) {
        circleRef = db.getDocRef('circles', activeCircleId);
        const circleDoc = await transaction.get(circleRef);
        circleState = circleDoc.exists ? circleDoc.data() : null;
      }

      // Re-check inside the transaction: a concurrent call may have assigned this attendee already
      const regRef = db.getDocRef('registrations', registration.id);
      const regDoc = await transaction.get(regRef);
      if (regDoc.exists && regDoc.data().circleId) {
        const assignedCircleId = regDoc.data().circleId;
        const assignedCircleDoc = await transaction.get(db.getDocRef('circles', assignedCircleId));
        if (assignedCircleDoc.exists) {
          return {
            success: true,
            type: 'live',
            circleId: assignedCircleId,
            circle: circleSummary(assignedCircleDoc.data(), registration.id),
            alreadyJoined: true,
          };
        }
      }

      // Join the partition's active circle unless it is closed, locked, merged, full or at the gender cap
      let needNewCircle = !circleState || circleState.status !== 'active' || circleState.isLocked;
      if (!needNewCircle) {
        if (shouldStartNewBucket(circleState)) needNewCircle = true;
        if (
          checkGenderCap(
            { male: circleState.maleCount, female: circleState.femaleCount },
            registration.gender,
            registration.allWomenToggle
          )
        ) {
          needNewCircle = true;
        }
      }

      const isNewCircle = needNewCircle;
      if (needNewCircle) {
        circleCounter += 1;
        circleState = createCircleState({
          level,
          genderPref,
          index: circleCounter,
          city,
          venue,
          eventDate,
          now,
        });
        activeCircleId = circleState.circleId;
        circleRef = db.getDocRef('circles', activeCircleId);
      }

      // Captain: the first opted-in volunteer, otherwise the circle's first member
      const newMember = toCircleMember(registration, now);
      if (registration.captainOptIn && !circleState.captainId) {
        newMember.isCaptain = true;
        circleState.captainId = registration.id;
        circleState.captainName = registration.name;
      }
      circleState.members = [...(circleState.members || []), newMember];
      circleState.totalCount = circleState.members.length;
      adjustGenderCount(circleState, registration.gender, 1);
      if (!circleState.captainId) {
        circleState.captainId = circleState.members[0].registrationId;
        circleState.captainName = circleState.members[0].name;
        circleState.members[0].isCaptain = true;
      }

      transaction.set(circleRef, circleState, { merge: true });
      transaction.set(
        groupStateRef,
        {
          activeCircleId,
          lastCircleCounter: circleCounter,
          ...(isNewCircle ? { circleIds: db.FieldValue.arrayUnion(activeCircleId) } : {}),
          updatedAt: now,
        },
        { merge: true }
      );
      transaction.set(regRef, { circleId: activeCircleId, updatedAt: now }, { merge: true });

      return {
        success: true,
        type: 'live',
        circleId: activeCircleId,
        circle: circleSummary(circleState, registration.id),
        alreadyJoined: false,
      };
    });
  }

  // -------------------------------------------------------------------------
  // 2. ADVANCE REGISTRATION (queue into the matching pool)
  // -------------------------------------------------------------------------
  if (registrationType === 'advance') {
    const poolDocId = db.getPoolDocId(city, venue, level, genderPref, eventDate);

    // Fast idempotency check before opening a transaction
    const existingPool = (await db.getPendingPool(city, venue, level, genderPref, eventDate)) || [];
    if (existingPool.some((item) => item.registrationId === registration.id)) {
      return {
        success: true,
        type: 'advance',
        eventDate,
        poolSize: existingPool.length,
        alreadyJoined: true,
      };
    }

    return await db.runTransaction(async (transaction) => {
      const poolRef = db.getDocRef('pools', poolDocId);
      const poolDoc = await transaction.get(poolRef);
      const currentPool = poolDoc.exists ? poolDoc.data().poolArray || [] : [];

      if (currentPool.some((item) => item.registrationId === registration.id)) {
        return {
          success: true,
          type: 'advance',
          eventDate,
          poolSize: currentPool.length,
          alreadyJoined: true,
        };
      }

      // No phone number in the pool: circles are built from these entries and shared with members
      currentPool.push({
        registrationId: registration.id,
        name: registration.name,
        gender: registration.gender,
        ageBand: registration.ageBand,
        skillLevel: registration.skillLevel,
        allWomenToggle: Boolean(registration.allWomenToggle),
        captainOptIn: Boolean(registration.captainOptIn),
        joinedPoolAt: now,
      });
      transaction.set(poolRef, { poolArray: currentPool }, { merge: true });

      return {
        success: true,
        type: 'advance',
        eventDate,
        poolSize: currentPool.length,
        alreadyJoined: false,
      };
    });
  }

  throw new Error(`[joinMatchingBucket] Unknown registrationType: '${registrationType}'`);
}

module.exports = {
  maskSecret,
  joinMatchingBucket,
};
