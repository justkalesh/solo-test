/**
 * @file netlify/functions/organizer/admin-auth.js
 * @description Venue Organizer Authentication Endpoint for SoloSaathi Circle.
 *
 * Enforces:
 * - Direct authentication via Venue ID + Password only (NO public or browsable venue list is exposed).
 * - Issues cryptographically signed HMAC session tokens for organizer dashboard operations.
 *
 * LOUD SECURITY WARNING:
 * ---------------------------------------------------------------------------------------------
 * The password check below uses a deterministic derivation formula as a Phase 2 scaffolding stub.
 * THIS IS NOT PRODUCTION-SAFE. Before onboarding actual commercial ground organizers, this stub
 * MUST be replaced with a secure per-venue credential vault using Argon2/bcrypt salted hashes
 * stored in Netlify Blobs or an enterprise identity provider.
 * ---------------------------------------------------------------------------------------------
 */

const crypto = require('crypto');
const config = require('../../config/env');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');

/**
 * Deterministic formula generating the temporary mock password for a venue ID.
 *
 * @param {string} venueId - Normalized venue ground identifier.
 * @returns {string} 10-character deterministic hex password.
 */
function deriveMockVenuePassword(venueId) {
  // LOUD WARNING: NOT PRODUCTION-SAFE. Replace with real hashed credentials in production.
  const salt = 'solosaathi_navratri_2026_mock_salt';
  return crypto
    .createHash('sha256')
    .update(`${String(venueId).trim().toLowerCase()}:${salt}`)
    .digest('hex')
    .slice(0, 10);
}

/**
 * Generates an HMAC-signed session token for authenticated venue organizers.
 *
 * @param {string} venueId - Venue ground identifier.
 * @returns {string} Signed session token string.
 */
function createOrganizerToken(venueId) {
  const payload = {
    venueId: String(venueId).trim(),
    role: 'venue_organizer',
    iat: Date.now(),
    exp: Date.now() + 12 * 3600 * 1000, // 12-hour session
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.ADMIN_SECRET)
    .update(payloadB64)
    .digest('hex');

  return `${payloadB64}.${signature}`;
}

/**
 * Validates an organizer session token.
 *
 * @param {string} token - The session token string.
 * @returns {{valid: boolean, venueId?: string, error?: string}} Validation result.
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
  const expectedSig = crypto
    .createHmac('sha256', config.ADMIN_SECRET)
    .update(payloadB64)
    .digest('hex');

  if (providedSig !== expectedSig) {
    return { valid: false, error: 'Invalid token signature.' };
  }

  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Organizer session token expired.' };
    }

    return { valid: true, venueId: payload.venueId };
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

  const { venueId, password } = body;
  if (!venueId || typeof venueId !== 'string') {
    return errorResponse('Missing required parameter: venueId.', 400);
  }

  if (!password || typeof password !== 'string') {
    return errorResponse('Missing required parameter: password.', 400);
  }

  const cleanVenueId = venueId.trim();
  const cleanPassword = password.trim();

  // Validate credentials: check either deterministic formula OR master ADMIN_SECRET
  const expectedPassword = deriveMockVenuePassword(cleanVenueId);
  const isFormulaMatch = cleanPassword === expectedPassword;
  const isMasterAdminMatch = cleanPassword === config.ADMIN_SECRET;

  if (!isFormulaMatch && !isMasterAdminMatch) {
    return errorResponse('Invalid Venue ID or Password.', 401);
  }

  const token = createOrganizerToken(cleanVenueId);

  return successResponse({
    message: 'Organizer authentication successful.',
    venueId: cleanVenueId,
    token,
    expiresInHours: 12,
  });
};

module.exports = {
  deriveMockVenuePassword,
  createOrganizerToken,
  verifyOrganizerToken,
  handler: exports.handler,
};
