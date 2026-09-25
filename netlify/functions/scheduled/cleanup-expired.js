/**
 * @file netlify/functions/scheduled/cleanup-expired.js
 * @description Netlify Scheduled Function: Daily Firestore TTL Cleanup.
 *
 * Workaround for Firestore's native TTL feature — automatically deletes expired
 * documents in the `otp` and `verified` collections on a daily schedule.
 *
 * - Uses the shared `db.js` singleton for Firebase Admin initialization.
 * - Compares `expiresAt` (stored as epoch milliseconds) against `Date.now()`.
 * - Processes up to 500 expired documents per collection per run (Firestore batch limit).
 * - CRON SCHEDULE RATIONALE:
 *   "@daily" (runs once per day at midnight UTC: '0 0 * * *'), set in netlify.toml
 *   ([functions."cleanup-expired"]) because this file is exposed through a shim.
 *   OTP codes expire in minutes and verified sessions in 30 minutes, so stale
 *   documents accumulate harmlessly. A daily sweep keeps the collections lean
 *   without incurring excessive function invocations.
 */

const db = require('../../shared/db');

/**
 * Netlify Function Handler: Deletes expired documents from OTP and verified collections.
 *
 * @param {Object} event - Netlify HTTP event (provided by scheduler).
 * @returns {Promise<Object>} Netlify HTTP response with cleanup summary.
 */
exports.handler = async (event) => {
  const collectionsToClean = ['otp', 'verified'];
  const now = Date.now();
  const results = {};

  try {
    if (!db.db) {
      console.error('[cleanup-expired] Firestore is not initialized. Skipping cleanup.');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Firestore is not initialized.' }),
      };
    }

    for (const collectionName of collectionsToClean) {
      // Query documents where expiresAt (epoch ms) is at or before the current time
      const snapshot = await db.db
        .collection(collectionName)
        .where('expiresAt', '<=', now)
        .limit(500)
        .get();

      if (snapshot.empty) {
        console.log(`[cleanup-expired] No expired documents in '${collectionName}'.`);
        results[collectionName] = { deleted: 0 };
        continue;
      }

      const batch = db.db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(
        `[cleanup-expired] Deleted ${snapshot.size} expired documents from '${collectionName}'.`
      );
      results[collectionName] = { deleted: snapshot.size };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Cleanup executed successfully.',
        results,
      }),
    };
  } catch (error) {
    console.error('[cleanup-expired] Fatal error during cleanup:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error during cleanup.',
        message: error.message,
      }),
    };
  }
};
