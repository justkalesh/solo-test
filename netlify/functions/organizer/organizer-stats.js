/**
 * @file netlify/functions/organizer/organizer-stats.js
 * @description Venue Organizer Operations & Analytics Dashboard API for SoloSaathi Circle.
 *
 * Implements:
 * - Session authentication check via verifyOrganizerToken or ADMIN_SECRET.
 * - Venue-scoped data aggregation.
 * - AGGREGATE-ONLY metrics:
 *   - Total registrations with Live vs Advance split.
 *   - Skill-level distribution (Beginner, Intermediate, Advanced).
 *   - Gender distribution (Male, Female, Prefer not to say).
 *   - Circles formed, average circle size, and all-women circle count.
 *   - Venue gate show-up count and show-up rate percentage.
 *
 * CRITICAL PRIVACY & SECURITY REQUIREMENT:
 * ---------------------------------------------------------------------------------------------
 * Money / revenue figures, attendee names, and phone numbers are STRICTLY EXCLUDED server-side.
 * The response is built exclusively via an explicit allowlist of aggregated numerical statistics.
 * ---------------------------------------------------------------------------------------------
 */

const config = require('../../config/env');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { getIstTime } = require('../../shared/matching');
const { verifyOrganizerToken } = require('./admin-auth');
const db = require('../../shared/db');

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
  const isMasterAdmin = token === config.ADMIN_SECRET;

  let authenticatedVenueId = null;

  if (!isMasterAdmin) {
    const authResult = verifyOrganizerToken(token);
    if (!authResult.valid) {
      return errorResponse(
        authResult.error || 'Unauthorized: Valid organizer session token required.',
        401
      );
    }
    authenticatedVenueId = authResult.venueId;
  }

  // 2. Resolve query parameters: city, venue, eventDate
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
  const venue = String(queryParams.venue || authenticatedVenueId || '').trim();
  const city = String(queryParams.city || '').trim();

  if (!venue) {
    return errorResponse("Missing required 'venue' identifier.", 400);
  }

  try {
    // 3. Fetch venue showups
    const showupsList = (await db.getShowups(city, venue)) || [];
    const totalShowups = showupsList.length;

    // 4. Retrieve venue groups across partitions to aggregate metrics
    const skillLevels = ['beginner', 'intermediate', 'advanced'];
    const genderPrefs = ['mixed', 'allWomen'];

    let liveCount = 0;
    let advanceCount = 0;
    let beginnerCount = 0;
    let intermediateCount = 0;
    let advancedCount = 0;
    let maleCount = 0;
    let femaleCount = 0;
    let preferNotToSayCount = 0;
    let allWomenCirclesCount = 0;

    const recordedCircleIds = new Set();
    const circlesList = [];

    for (const lvl of skillLevels) {
      for (const pref of genderPrefs) {
        // Live state aggregation
        const groupState = await db.getGroupState(city, venue, lvl, pref, eventDate);
        if (groupState && groupState.activeCircleId) {
          if (!recordedCircleIds.has(groupState.activeCircleId)) {
            recordedCircleIds.add(groupState.activeCircleId);
            const cState = await db.getCircleState(groupState.activeCircleId);
            if (cState) {
              circlesList.push(cState);
              if (cState.isAllWomen) allWomenCirclesCount += 1;

              for (const m of cState.members || []) {
                liveCount += 1;
                if (m.skillLevel === 'beginner') beginnerCount += 1;
                else if (m.skillLevel === 'advanced') advancedCount += 1;
                else intermediateCount += 1;

                if (m.gender === 'male') maleCount += 1;
                else if (m.gender === 'female') femaleCount += 1;
                else preferNotToSayCount += 1;
              }
            }
          }
        }

        // Advance pending pool aggregation
        const pendingPool = await db.getPendingPool(city, venue, lvl, pref, eventDate);
        if (Array.isArray(pendingPool)) {
          for (const m of pendingPool) {
            advanceCount += 1;
            if (m.skillLevel === 'beginner') beginnerCount += 1;
            else if (m.skillLevel === 'advanced') advancedCount += 1;
            else intermediateCount += 1;

            if (m.gender === 'male') maleCount += 1;
            else if (m.gender === 'female') femaleCount += 1;
            else preferNotToSayCount += 1;
          }
        }
      }
    }

    const totalRegistrations = liveCount + advanceCount;
    const totalCircles = circlesList.length;
    const totalCircleMembers = circlesList.reduce((acc, c) => acc + (c.totalCount || 0), 0);
    const averageCircleSize =
      totalCircles > 0 ? Number((totalCircleMembers / totalCircles).toFixed(1)) : 0;

    const showUpRatePercentage =
      totalRegistrations > 0
        ? Number(((totalShowups / totalRegistrations) * 100).toFixed(1))
        : 0;

    // 5. STRICT SERVER-SIDE WHITELIST: Exclude money, names, and phone numbers
    const aggregateDashboardPayload = {
      venue: venue,
      city: city || null,
      eventDate: eventDate,
      registrations: {
        total: totalRegistrations,
        live: liveCount,
        advance: advanceCount,
      },
      skillLevelBreakdown: {
        beginner: beginnerCount,
        intermediate: intermediateCount,
        advanced: advancedCount,
      },
      genderBalance: {
        male: maleCount,
        female: femaleCount,
        prefer_not_to_say: preferNotToSayCount,
      },
      circles: {
        totalFormed: totalCircles,
        averageSize: averageCircleSize,
        allWomenCircleCount: allWomenCirclesCount,
      },
      attendance: {
        totalShowups: totalShowups,
        showUpRatePercentage: showUpRatePercentage,
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
