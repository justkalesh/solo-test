/**
 * @file netlify/functions/scheduled/auto-finalize.js
 * @description Netlify Scheduled Function: Automated Circle Finalization & 48h Group Formation Trigger.
 *
 * Implements:
 * - Netlify Scheduled Function export (`exports.config = { schedule: "@hourly" }`).
 * - CRON SCHEDULE RATIONALE:
 *   "@hourly" (runs at the start of every hour: '0 * * * *').
 *   This frequency ensures that the 48-hour group formation commitment is fulfilled promptly
 *   when an event enters the 48h window, while avoiding wasteful execution costs from sub-minute polling.
 * - Triggers finalization if:
 *   1. Event is within 48 hours of its 7:30 PM IST start (`hoursUntilEvent <= 48`) AND pool has at least 3 attendees.
 *   2. OR when a pool organically reaches a healthy group size (12+ attendees).
 * - Converts pending pool into active circles with Captain assignment and persists updated state.
 */

const {
  GENDER_CAP,
  ALL_WOMEN_MIN_FLOOR,
  ALL_WOMEN_ABSOLUTE_MIN,
  SOFT_MAX_GROUP,
} = require('../../shared/constants');
const { buildCircleId, getIstTime } = require('../../shared/matching');
const db = require('../../shared/db');

// Netlify Scheduled Function configuration
exports.config = {
  schedule: '@hourly',
};

/**
 * Calculates hours remaining until the event's 7:30 PM IST start time on eventDate.
 *
 * @param {string} eventDateStr - 'YYYY-MM-DD'
 * @param {number} nowMs - Current epoch milliseconds
 * @returns {number} Hours remaining
 */
function getHoursUntilEvent(eventDateStr, nowMs) {
  const [year, month, day] = eventDateStr.split('-').map(Number);
  // 7:30 PM IST = 19:30 IST = 14:00 UTC
  const eventStartUtcMs = Date.UTC(year, month - 1, day, 14, 0, 0);
  return (eventStartUtcMs - nowMs) / 3600000;
}

/**
 * Scheduled handler triggered by Netlify's cron runtime.
 *
 * @param {Object} event - Scheduled event payload from Netlify.
 * @returns {Promise<{statusCode: number, body: string}>}
 */
exports.handler = async (event) => {
  const now = Date.now();
  console.log(`[auto-finalize cron] Execution started at ${new Date(now).toISOString()}`);

  const finalizedCircles = [];
  const processedPartitions = [];

  try {
    const venuesData = (await db.getVenues()) || {};
    const ist = getIstTime();

    // Check festival dates for the upcoming 7 days
    const upcomingDates = [];
    for (let d = 0; d < 7; d++) {
      const futureDate = new Date(ist.istDate.getTime() + d * 24 * 3600000);
      const pad = (n) => String(n).padStart(2, '0');
      upcomingDates.push(
        `${futureDate.getFullYear()}-${pad(futureDate.getMonth() + 1)}-${pad(futureDate.getDate())}`
      );
    }

    const skillLevels = ['beginner', 'intermediate', 'advanced'];
    const genderPrefs = ['mixed', 'allWomen'];

    const cities = Object.keys(venuesData);

    for (const city of cities) {
      const venuesInCity = Array.isArray(venuesData[city]) ? venuesData[city] : [];

      for (const venueObj of venuesInCity) {
        const venueName = typeof venueObj === 'string' ? venueObj : venueObj.name;

        for (const eventDate of upcomingDates) {
          const hoursUntilEvent = getHoursUntilEvent(eventDate, now);

          for (const level of skillLevels) {
            for (const genderPref of genderPrefs) {
              const partitionId = `${city}:${venueName}:${level}:${genderPref}:${eventDate}`;

              const pool =
                (await db.getPendingPool(city, venueName, level, genderPref, eventDate)) || [];

              if (!Array.isArray(pool) || pool.length === 0) {
                continue;
              }

              // Trigger condition 1: Organically healthy group size (12+)
              const isHealthySize = pool.length >= 12;

              // Trigger condition 2: Crossing 48-hour commitment threshold with viable quorum
              const isWithin48Hours = hoursUntilEvent <= 48 && hoursUntilEvent > 0;
              const hasQuorum = genderPref === 'allWomen'
                ? pool.length >= ALL_WOMEN_ABSOLUTE_MIN
                : pool.length >= 3;

              if (isHealthySize || (isWithin48Hours && hasQuorum)) {
                console.log(
                  `[auto-finalize cron] Finalizing pool '${partitionId}' (count: ${pool.length}, hoursUntil: ${hoursUntilEvent.toFixed(1)}h)`
                );

                const isAllWomen = genderPref === 'allWomen';
                const selectedMembers = [];
                const remainingPool = [];
                let maleCount = 0;
                let femaleCount = 0;
                let otherCount = 0;

                for (const attendee of pool) {
                  if (selectedMembers.length >= SOFT_MAX_GROUP) {
                    remainingPool.push(attendee);
                    continue;
                  }

                  if (isAllWomen) {
                    selectedMembers.push(attendee);
                    femaleCount += 1;
                  } else {
                    if (attendee.gender === 'male') {
                      if (maleCount + 1 <= GENDER_CAP) {
                        selectedMembers.push(attendee);
                        maleCount += 1;
                      } else {
                        remainingPool.push(attendee);
                      }
                    } else if (attendee.gender === 'female') {
                      if (femaleCount + 1 <= GENDER_CAP) {
                        selectedMembers.push(attendee);
                        femaleCount += 1;
                      } else {
                        remainingPool.push(attendee);
                      }
                    } else {
                      selectedMembers.push(attendee);
                      otherCount += 1;
                    }
                  }
                }

                // Determine next circle index
                const groupState =
                  (await db.getGroupState(city, venueName, level, genderPref, eventDate)) || {};
                const nextIndex = (groupState.lastCircleCounter || 0) + 1;
                const circleId = buildCircleId(level, genderPref, nextIndex);

                // Elect captain: first opted-in, or first attendee
                let captain = selectedMembers.find((m) => m.captainOptIn) || selectedMembers[0];

                const circleMembers = selectedMembers.map((m) => ({
                  registrationId: m.registrationId,
                  name: m.name,
                  whatsapp: m.whatsapp,
                  gender: m.gender,
                  ageBand: m.ageBand,
                  skillLevel: m.skillLevel,
                  captainOptIn: m.captainOptIn,
                  isCaptain: captain ? m.registrationId === captain.registrationId : false,
                  joinedAt: now,
                }));

                const circleState = {
                  circleId,
                  name: circleId.replace('-', ' '),
                  skillLevel: level,
                  isAllWomen,
                  city,
                  venue: venueName,
                  eventDate,
                  captainId: captain ? captain.registrationId : null,
                  captainName: captain ? captain.name : null,
                  meetingPoint: 'Near Main Festival Entrance / Information Desk',
                  chatLink: `https://chat.whatsapp.com/adv_${circleId.toLowerCase()}`,
                  members: circleMembers,
                  maleCount,
                  femaleCount,
                  otherCount,
                  totalCount: circleMembers.length,
                  status: 'active',
                  isLocked: false,
                  createdAt: now,
                };

                // Persist updates
                await db.saveCircleState(circleId, circleState);

                for (const member of circleMembers) {
                  const reg = (await db.getRegistration(member.registrationId)) || {};
                  await db.saveRegistration(member.registrationId, {
                    ...reg,
                    circleId,
                    updatedAt: now,
                  });
                }

                await db.savePendingPool(
                  city,
                  venueName,
                  level,
                  genderPref,
                  eventDate,
                  remainingPool
                );

                await db.saveGroupState(city, venueName, level, genderPref, eventDate, {
                  activeCircleId: circleId,
                  lastCircleCounter: nextIndex,
                  updatedAt: now,
                });

                finalizedCircles.push(circleId);
                processedPartitions.push(partitionId);
              }
            }
          }
        }
      }
    }

    console.log(`[auto-finalize cron] Completed. Finalized ${finalizedCircles.length} circles.`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        finalizedCircles,
        processedPartitions,
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
