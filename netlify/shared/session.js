/**
 * @file netlify/shared/session.js
 * @description Signed attendee sessions.
 *
 * verify-otp issues a token proving "this caller controls this WhatsApp number". Endpoints that
 * expose or change an attendee's data (find-my-circle, circle-actions, get-circle) require it,
 * and only act on registrations that belong to that number.
 *
 * Token format: `<base64url(JSON payload)>.<hex HMAC-SHA256>`, signed with ATTENDEE_SESSION_SECRET.
 */

const crypto = require('crypto');
const config = require('../config/env');
const { ATTENDEE_SESSION_TTL_HOURS } = require('./constants');
const { errorResponse } = require('./response');

function sign(payloadB64) {
  return crypto
    .createHmac('sha256', config.ATTENDEE_SESSION_SECRET)
    .update(`attendee.${payloadB64}`)
    .digest('hex');
}

/**
 * Issues a session token for a verified phone number.
 *
 * @param {string} phone - Normalized 10-digit number.
 * @param {number} [now=Date.now()]
 * @returns {string} Signed token.
 */
function createAttendeeToken(phone, now = Date.now()) {
  const payload = {
    phone,
    role: 'attendee',
    iat: now,
    exp: now + ATTENDEE_SESSION_TTL_HOURS * 3600 * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Verifies a session token.
 *
 * @param {string} token
 * @returns {{valid: true, phone: string} | {valid: false, error: string}}
 */
function verifyAttendeeToken(token) {
  if (!token || typeof token !== 'string') return { valid: false, error: 'Missing session token.' };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, error: 'Malformed session token.' };
  const [payloadB64, providedSig] = parts;
  const expected = Buffer.from(sign(payloadB64), 'hex');
  const provided = Buffer.from(providedSig, 'hex');
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return { valid: false, error: 'Invalid session token.' };
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.role !== 'attendee' || !payload.phone) {
      return { valid: false, error: 'Invalid session token.' };
    }
    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Your session has expired. Please verify your number again.' };
    }
    return { valid: true, phone: payload.phone };
  } catch {
    return { valid: false, error: 'Invalid session token.' };
  }
}

/**
 * Reads `Authorization: Bearer <token>` from a Netlify event.
 *
 * @param {Object} event - Netlify HTTP event.
 * @returns {string} Token, or '' if absent.
 */
function getBearerToken(event) {
  const header = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  return header.replace(/^Bearer\s+/i, '').trim();
}

/**
 * Resolves the calling attendee, or builds the 401 response to return.
 *
 * @param {Object} event - Netlify HTTP event.
 * @returns {{phone: string, response: null} | {phone: null, response: Object}}
 */
function requireAttendee(event) {
  const result = verifyAttendeeToken(getBearerToken(event));
  if (!result.valid) {
    return {
      phone: null,
      response: errorResponse(
        `${result.error} Verify your WhatsApp number with OTP to continue.`,
        401,
        { sessionRequired: true }
      ),
    };
  }
  return { phone: result.phone, response: null };
}

module.exports = {
  createAttendeeToken,
  verifyAttendeeToken,
  getBearerToken,
  requireAttendee,
};
