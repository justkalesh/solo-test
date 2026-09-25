/**
 * @file netlify/functions/circle/finalize-bucket.js
 * @description Admin trigger for advance circles (the manual version of scheduled/auto-finalize).
 *
 * - Admin Protected: Requires valid ADMIN_SECRET in the `x-admin-secret` header, a Bearer token,
 *   or `adminSecret` in the body.
 * - Body: { city, venue, level, genderPref, eventDate, mergeSmallCircles? }
 *   1. Places everyone in that pool into circles (stage 1, same rules as the scheduled job:
 *      SOFT_MAX_GROUP = 24, GENDER_CAP = 10, captain = first volunteer or first member).
 *   2. With `mergeSmallCircles: true`, also merges that venue and night's small circles now
 *      (stage 2), regardless of the 12-hour timing.
 */

const config = require('../../config/env');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { formCirclesFromPool, mergeSmallCircles } = require('../../shared/advance-circles');

/**
 * Validates admin authentication against ADMIN_SECRET.
 *
 * @param {Object} event - Netlify HTTP event.
 * @param {Object} body - Parsed JSON body.
 * @returns {boolean} True if authenticated.
 */
function checkAdminAuth(event, body) {
  const headerSecret =
    event.headers['x-admin-secret'] ||
    event.headers['X-Admin-Secret'] ||
    (event.headers['authorization'] || '').replace(/^Bearer\s+/i, '');

  const bodySecret = body?.adminSecret;
  return (
    (headerSecret && headerSecret === config.ADMIN_SECRET) ||
    (bodySecret && bodySecret === config.ADMIN_SECRET)
  );
}

/**
 * Netlify Function Handler: forms (and optionally merges) advance circles on demand.
 *
 * @param {Object} event - Netlify HTTP event.
 * @param {Object} context - Netlify execution context.
 * @returns {Promise<Object>} Netlify HTTP response.
 */
exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse('Method Not Allowed. Use POST.', 405);
  }

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return errorResponse('Invalid JSON body in request payload.', 400);
  }

  if (!checkAdminAuth(event, body)) {
    return errorResponse('Unauthorized: Invalid or missing ADMIN_SECRET.', 401);
  }

  const { city, venue, level, genderPref, eventDate } = body;
  if (!city || !venue || !level || !genderPref || !eventDate) {
    return errorResponse(
      'Missing required partition parameters: city, venue, level, genderPref, eventDate.',
      400
    );
  }

  try {
    const now = Date.now();
    const formed = await formCirclesFromPool({ city, venue, level, genderPref, eventDate }, now);
    const merged = body.mergeSmallCircles ? await mergeSmallCircles({ city, venue, eventDate }, now) : null;

    if (formed.placed === 0 && !merged) {
      return errorResponse('Pending pool is empty for this partition.', 404);
    }

    return successResponse({
      circleIds: formed.circleIds,
      placed: formed.placed,
      merges: merged ? merged.moves : [],
      flaggedCircles: merged ? merged.flagged : [],
    });
  } catch (error) {
    console.error('[finalize-bucket fatal error]', error);
    return errorResponse(error.message || 'Internal server error during pool finalization.', 500);
  }
};
