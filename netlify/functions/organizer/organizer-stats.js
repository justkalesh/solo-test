/**
 * @file netlify/functions/organizer/organizer-stats.js
 * @description Venue Organizer Operations & Analytics Dashboard API for SoloSaathi Circle.
 *
 * Implements:
 * - Session authentication via the organizer token from admin-auth. The city and venue come from
 *   the token, so an organizer only ever sees their own venue. Only a master admin session
 *   (ALLOW_MASTER_ADMIN_LOGIN) may pass `city` / `venue` to look at another venue.
 * - Venue-scoped data aggregation for one night (`eventDate`, defaults to today in IST), across
 *   every circle created that night (groupstate.circleIds), plus advance pools not yet formed.
 * - AGGREGATE-ONLY metrics:
 *   - Total registrations with Live vs Advance split.
 *   - Skill-level distribution (Beginner, Intermediate, Advanced).
 *   - Gender distribution (Male, Female, Prefer not to say).
 *   - Circles formed, average circle size, all-women circle count, and circles flagged for the
 *     organizer (small advance circles the 12-hour merge could not place).
 *   - Venue gate show-up count and show-up rate percentage.
 *
 * CRITICAL PRIVACY & SECURITY REQUIREMENT:
 * ---------------------------------------------------------------------------------------------
 * Money / revenue figures, attendee names, and phone numbers are STRICTLY EXCLUDED server-side.
 * The response is built exclusively via an explicit allowlist of aggregated numerical statistics.
 * ---------------------------------------------------------------------------------------------
 */

const config = require('../../config/env');
const { SKILL_TIERS } = require('../../shared/constants');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { getIstTime } = require('../../shared/matching');
const { verifyOrganizerToken } = require('./admin-auth');
const db = require('../../shared/db');

const GENDER_PREFS = ['mixed', 'allWomen'];

/**
 * Netlify Function Handler: Returns aggregate operations data for venue organizers.
 *
 * @param {Object} event - Netlify HTTP event.
 * @param {Object} context - Netlify execution context.
 * @returns {Promise<Object>} Netlify HTTP response.
 */
exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return errorResponse('Method Not Allowed. Use GET or POST.', 405);
  }

  // 1. Authenticate organizer session
  const authHeader =
    event.headers['authorization'] ||
    event.headers['Authorization'] ||
    event.headers['x-organizer-token'] ||
    '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  let session;
  if (config.ALLOW_MASTER_ADMIN_LOGIN && token === config.ADMIN_SECRET) {
    session = { isMaster: true, city: null, venue: null };
  } else {
    session = verifyOrganizerToken(token);
    if (!session.valid) {
      return errorResponse(
        session.error || 'Unauthorized: Valid organizer session token required.',
        401
      );
    }
  }

  // 2. Resolve query parameters
  let queryParams = {};
  if (event.httpMethod === 'GET') {
    queryParams = event.queryStringParameters || {};
  } else {
    try {
      queryParams = event.body ? JSON.parse(event.body) : {};
    } catch (e) {
      queryParams = {};
    }
  }

  const ist = getIstTime();
  const eventDate = String(queryParams.eventDate || ist.dateString).trim();
  const city = String((session.isMaster && queryParams.city) || session.city || '').trim();
  const venue = String((session.isMaster && queryParams.venue) || session.venue || '').trim();

  if (!city || !venue) {
    return errorResponse(
      'This organizer account has no venue assigned. Ask festival operations to set it up.',
      400
    );
  }

  try {
    // 3. Venue showups for the night
    const showupsList = (await db.getShowups(city, venue, eventDate)) || [];
    const totalShowups = showupsList.length;

    // 4. Every circle created that night, plus advance pools not yet formed
    let liveCount = 0;
    let advanceCount = 0;
    const skillCounts = { beginner: 0, intermediate: 0, advanced: 0 };
    const genderCounts = { male: 0, female: 0, prefer_not_to_say: 0 };
    let allWomenCirclesCount = 0;
    let needsAttentionCount = 0;

    const countPerson = (person) => {
      const level = SKILL_TIERS.includes(person.skillLevel) ? person.skillLevel : 'intermediate';
      skillCounts[level] += 1;
      if (person.gender === 'male') genderCounts.male += 1;
      else if (person.gender === 'female') genderCounts.female += 1;
      else genderCounts.prefer_not_to_say += 1;
    };

    const seenCircleIds = new Set();
    const circlesList = [];

    for (const level of SKILL_TIERS) {
      for (const pref of GENDER_PREFS) {
        const groupState = await db.getGroupState(city, venue, level, pref, eventDate);
        const circleIds =
          groupState?.circleIds || (groupState?.activeCircleId ? [groupState.activeCircleId] : []);

        for (const circleId of circleIds) {
          if (seenCircleIds.has(circleId)) continue;
          seenCircleIds.add(circleId);

          const circle = await db.getCircleState(circleId);
          if (!circle || circle.status === 'merged') continue; // merged members are counted in the receiver
          circlesList.push(circle);
          if (circle.isAllWomen) allWomenCirclesCount += 1;
          if (circle.needsOrganizerAttention) needsAttentionCount += 1;

          for (const member of circle.members || []) {
            if (circle.origin === 'advance') advanceCount += 1;
            else liveCount += 1;
            countPerson(member);
          }
        }

        const pendingPool = await db.getPendingPool(city, venue, level, pref, eventDate);
        for (const person of Array.isArray(pendingPool) ? pendingPool : []) {
          advanceCount += 1;
          countPerson(person);
        }
      }
    }

    const totalRegistrations = liveCount + advanceCount;
    const circlesWithMembers = circlesList.filter((c) => (c.members || []).length > 0);
    const totalCircles = circlesWithMembers.length;
    const totalCircleMembers = circlesWithMembers.reduce((acc, c) => acc + (c.members || []).length, 0);
    const averageCircleSize =
      totalCircles > 0 ? Number((totalCircleMembers / totalCircles).toFixed(1)) : 0;

    const showUpRatePercentage =
      totalRegistrations > 0
        ? Number(((totalShowups / totalRegistrations) * 100).toFixed(1))
        : 0;

    // 5. STRICT SERVER-SIDE WHITELIST: Exclude money, names, and phone numbers
    const aggregateDashboardPayload = {
      venue,
      city,
      eventDate,
      registrations: {
        total: totalRegistrations,
        live: liveCount,
        advance: advanceCount,
      },
      skillLevelBreakdown: skillCounts,
      genderBalance: genderCounts,
      circles: {
        totalFormed: totalCircles,
        averageSize: averageCircleSize,
        allWomenCircleCount: allWomenCirclesCount,
        needsAttention: needsAttentionCount,
      },
      attendance: {
        totalShowups,
        showUpRatePercentage,
      },
      dataFreshnessTimestamp: Date.now(),
    };

    return successResponse(aggregateDashboardPayload);
  } catch (error) {
    console.error('[organizer-stats fatal error]', error);
    return errorResponse(
      error.message || 'Internal server error calculating organizer dashboard statistics.',
      500
    );
  }
};
