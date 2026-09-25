/**
 * @file netlify/functions/organizer/admin-auth.js
 * @description Venue Organizer Authentication Endpoint for SoloSaathi Circle.
 *
 * Enforces:
 * - Direct authentication via Venue ID + Password only (NO public or browsable venue list is exposed).
 * - Accounts live in Firestore `organizers/{VENUE_ID}` with a salted scrypt hash
 *   (`passwordHash`, `salt`), the `city` and `venue` they manage, and `disabled`. Create them with
 *   `node --env-file=.env scripts/create-organizer.js <VENUE_ID> <City> "<Venue name>"`.
 * - Issues HMAC-signed 12-hour session tokens carrying `venueId`, `city` and `venue`, so
 *   organizer-stats always reports on the organizer's own venue.
 * - The master login (password = ADMIN_SECRET, any venue ID) only works when
 *   ALLOW_MASTER_ADMIN_LOGIN=true. Keep it off in production.
 */

const crypto = require('crypto');
const config = require('../../config/env');
const { ORGANIZER_SESSION_TTL_HOURS } = require('../../shared/constants');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { checkOrganizerPassword } = require('../../shared/organizer-accounts');
const db = require('../../shared/db');

function signOrganizerPayload(payloadB64) {
  return crypto.createHmac('sha256', config.ADMIN_SECRET).update(payloadB64).digest('hex');
}

/**
 * Generates an HMAC-signed session token for an authenticated organizer.
 *
 * @param {{venueId: string, city: string|null, venue: string|null, isMaster?: boolean}} account
 * @returns {string} Signed session token string.
 */
function createOrganizerToken({ venueId, city, venue, isMaster = false }) {
  const now = Date.now();
  const payload = {
    venueId: String(venueId).trim().toUpperCase(),
    city: city || null,
    venue: venue || null,
    role: isMaster ? 'master_admin' : 'venue_organizer',
    iat: now,
    exp: now + ORGANIZER_SESSION_TTL_HOURS * 3600 * 1000,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${signOrganizerPayload(payloadB64)}`;
}

/**
 * Validates an organizer session token.
 *
 * @param {string} token - The session token string.
 * @returns {{valid: true, venueId: string, city: string|null, venue: string|null, isMaster: boolean}
 *   | {valid: false, error: string}} Validation result.
 */
function verifyOrganizerToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing or invalid.' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed token format.' };
  }

  const [payloadB64, providedSig] = parts;
  const expected = Buffer.from(signOrganizerPayload(payloadB64), 'hex');
  const provided = Buffer.from(providedSig, 'hex');
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return { valid: false, error: 'Invalid token signature.' };
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Organizer session token expired.' };
    }
    const isMaster = payload.role === 'master_admin';
    if (isMaster && !config.ALLOW_MASTER_ADMIN_LOGIN) {
      return { valid: false, error: 'Master admin sessions are disabled.' };
    }

    return {
      valid: true,
      venueId: payload.venueId,
      city: payload.city || null,
      venue: payload.venue || null,
      isMaster,
    };
  } catch (err) {
    return { valid: false, error: 'Failed to parse token payload.' };
  }
}

/**
 * Netlify Function Handler: Authenticates venue organizer and returns session token.
 *
 * @param {Object} event - Netlify HTTP event.
 * @param {Object} context - Netlify execution context.
 * @returns {Promise<Object>} Netlify HTTP response.
 */
async function handler(event, context) {
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

  const { venueId, password } = body;
  if (!venueId || typeof venueId !== 'string') {
    return errorResponse('Missing required parameter: venueId.', 400);
  }

  if (!password || typeof password !== 'string') {
    return errorResponse('Missing required parameter: password.', 400);
  }

  const cleanVenueId = venueId.trim().toUpperCase();
  const cleanPassword = password.trim();

  try {
    const account = await db.getOrganizer(cleanVenueId);

    if (account && !account.disabled && checkOrganizerPassword(account, cleanPassword)) {
      return successResponse({
        message: 'Organizer authentication successful.',
        venueId: cleanVenueId,
        city: account.city,
        venue: account.venue,
        token: createOrganizerToken({ venueId: cleanVenueId, city: account.city, venue: account.venue }),
        expiresInHours: ORGANIZER_SESSION_TTL_HOURS,
      });
    }

    // Test environments only: ADMIN_SECRET opens any venue ID
    if (config.ALLOW_MASTER_ADMIN_LOGIN && cleanPassword === config.ADMIN_SECRET) {
      console.warn(`[admin-auth] Master admin login used for venue ID ${cleanVenueId}.`);
      return successResponse({
        message: 'Master admin authentication successful.',
        venueId: cleanVenueId,
        city: account?.city || null,
        venue: account?.venue || null,
        token: createOrganizerToken({
          venueId: cleanVenueId,
          city: account?.city,
          venue: account?.venue,
          isMaster: true,
        }),
        expiresInHours: ORGANIZER_SESSION_TTL_HOURS,
      });
    }

    return errorResponse('Invalid Venue ID or Password.', 401);
  } catch (error) {
    console.error('[admin-auth fatal error]', error);
    return errorResponse('Could not sign in right now. Please try again.', 500);
  }
}

module.exports = {
  createOrganizerToken,
  verifyOrganizerToken,
  handler,
};
