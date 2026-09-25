/**
 * @file netlify/functions/scheduled/auto-finalize.js
 * @description Netlify Scheduled Function: advance circles for upcoming festival nights.
 *
 * Schedule: every 15 minutes, set in netlify.toml ([functions."auto-finalize"]). Netlify reads
 * the schedule from there because this file is exposed through a shim in netlify/functions/.
 *
 * For every venue in Firestore `config/venues` and each of the next 7 nights:
 * 1. Stage 1: pools become circles once the night is within ADVANCE_FINALIZE_HOURS_BEFORE_EVENT
 *    (48h) of its start, or as soon as a pool reaches ADVANCE_EARLY_FINALIZE_POOL_SIZE (12).
 * 2. Stage 2: from MERGE_HOURS_BEFORE_EVENT (12h) before the start, small circles (1–3 people)
 *    merge into a same- or neighbouring-tier circle with at most 10 people. It keeps running
 *    until the start so late changes are picked up; merged circles are skipped.
 * Both stages live in netlify/shared/advance-circles.js.
 */

const {
  SKILL_TIERS,
  ADVANCE_FINALIZE_HOURS_BEFORE_EVENT,
  ADVANCE_EARLY_FINALIZE_POOL_SIZE,
  MERGE_HOURS_BEFORE_EVENT,
} = require('../../shared/constants');
const { getIstTime, getHoursUntilEvent } = require('../../shared/matching');
const { GENDER_PREFS, formCirclesFromPool, mergeSmallCircles } = require('../../shared/advance-circles');
const db = require('../../shared/db');

/**
 * Scheduled handler triggered by Netlify's cron runtime.
 *
 * @param {Object} event - Scheduled event payload from Netlify.
 * @returns {Promise<{statusCode: number, body: string}>}
 */
exports.handler = async (event) => {
  const now = Date.now();
  console.log(`[auto-finalize cron] Execution started at ${new Date(now).toISOString()}`);

  const formed = [];
  const merges = [];
  const flagged = [];

  try {
    const venuesData = (await db.getVenues()) || {};
    const ist = getIstTime();

    const upcomingDates = [];
    for (let d = 0; d < 7; d++) {
      const futureDate = new Date(ist.istDate.getTime() + d * 24 * 3600000);
      const pad = (n) => String(n).padStart(2, '0');
      upcomingDates.push(
        `${futureDate.getFullYear()}-${pad(futureDate.getMonth() + 1)}-${pad(futureDate.getDate())}`
      );
    }

    for (const city of Object.keys(venuesData)) {
      const venuesInCity = Array.isArray(venuesData[city]) ? venuesData[city] : [];

      for (const venueObj of venuesInCity) {
        const venue = typeof venueObj === 'string' ? venueObj : venueObj.name;

        for (const eventDate of upcomingDates) {
          const hoursUntilEvent = getHoursUntilEvent(eventDate, now);
          if (hoursUntilEvent <= 0) continue; // already started

          // Stage 1: pools -> circles
          for (const level of SKILL_TIERS) {
            for (const genderPref of GENDER_PREFS) {
              const pool = (await db.getPendingPool(city, venue, level, genderPref, eventDate)) || [];
              if (pool.length === 0) continue;

              const withinWindow = hoursUntilEvent <= ADVANCE_FINALIZE_HOURS_BEFORE_EVENT;
              if (!withinWindow && pool.length < ADVANCE_EARLY_FINALIZE_POOL_SIZE) continue;

              const result = await formCirclesFromPool({ city, venue, level, genderPref, eventDate }, now);
              console.log(
                `[auto-finalize cron] ${city} / ${venue} / ${eventDate} / ${level} / ${genderPref}: placed ${result.placed} into ${result.circleIds.join(', ')}`
              );
              formed.push(...result.circleIds);
            }
          }

          // Stage 2: merge small circles
          if (hoursUntilEvent <= MERGE_HOURS_BEFORE_EVENT) {
            const result = await mergeSmallCircles({ city, venue, eventDate }, now);
            if (result.moves.length || result.flagged.length) {
              console.log(
                `[auto-finalize cron] ${city} / ${venue} / ${eventDate}: ${result.moves.length} merge(s), ${result.flagged.length} flagged for organizer`
              );
            }
            merges.push(...result.moves);
            flagged.push(...result.flagged);
          }
        }
      }
    }

    console.log(
      `[auto-finalize cron] Completed. Circles formed/updated: ${formed.length}, merges: ${merges.length}, flagged: ${flagged.length}.`
    );
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        formedCircles: formed,
        merges,
        flaggedCircles: flagged,
        executedAt: new Date(now).toISOString(),
      }),
    };
  } catch (error) {
    console.error('[auto-finalize cron fatal error]', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Auto-finalize cron execution failed.',
      }),
    };
  }
};
