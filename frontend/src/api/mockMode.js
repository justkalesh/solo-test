/**
 * Demo mode routing: decides, per request, whether ./mockApi.js answers instead of the
 * Netlify Functions. This lets the normal build (local, preview and production) run the whole
 * flow with test details and no service keys, while every real number goes to the real backend.
 *
 * The demo backend answers when:
 *   - send-otp, verify-otp, register, advance-register, find-my-circle: the phone is a test
 *     number, 90000 00000 to 90000 00999
 *   - verify-ticket: this tab is in a demo session (a test number was used last)
 *   - create-order, verify-payment: the registration ID is a demo one (`_mock_`)
 *   - circle-actions, get-circle: the attendee session token is a demo token
 *   - admin-auth: the venue ID starts with DEMO-; organizer-stats: a demo organizer token
 *   - always, when VITE_USE_MOCK_API=true (`npm run frontend:mock`)
 *
 * Keep this file small: it is always bundled, while mockApi.js is loaded only when needed.
 */

export const USE_MOCK_API_EVERYWHERE = import.meta.env?.VITE_USE_MOCK_API === 'true';

export const MOCK_RAZORPAY_KEY_ID = 'rzp_test_mock';
export const MOCK_ID_MARKER = '_mock_';
export const DEMO_VENUE_PREFIX = 'DEMO-';

const MOCK_SESSION_FLAG = 'solosaathi_demo_session';

/** Same as the backend's normalizePhone: digits only, without a leading 91. */
export function normalizePhone(phone) {
  const digits = String(phone || '').trim().replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

/** Test numbers: 9000000000 to 9000000999. */
export function isTestPhone(phone) {
  return /^9000000\d{3}$/.test(normalizePhone(phone));
}

export function isDemoVenueId(venueId) {
  return String(venueId || '').trim().toUpperCase().startsWith(DEMO_VENUE_PREFIX);
}

export function isMockId(id) {
  return typeof id === 'string' && id.includes(MOCK_ID_MARKER);
}

/** A payment order from the demo backend: pay through the fake checkout. */
export function isMockOrder(order) {
  return Boolean(order) && order.keyId === MOCK_RAZORPAY_KEY_ID;
}

/** Reads the payload of a `<base64url payload>.<signature>` token without verifying it. */
export function readTokenPayload(token) {
  try {
    const [payloadB64] = String(token || '').replace(/^Bearer\s+/i, '').split('.');
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '==='.slice((base64.length + 3) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0))));
  } catch {
    return null;
  }
}

const isMockToken = (token) => readTokenPayload(token)?.mock === true;

function setMockSession(on) {
  try {
    if (on) sessionStorage.setItem(MOCK_SESSION_FLAG, '1');
    else sessionStorage.removeItem(MOCK_SESSION_FLAG);
  } catch {
    // Storage blocked: ticket checks go to the real backend
  }
}

function inMockSession() {
  try {
    return sessionStorage.getItem(MOCK_SESSION_FLAG) === '1';
  } catch {
    return false;
  }
}

const PHONE_ROUTED = new Set(['send-otp', 'verify-otp', 'register', 'advance-register', 'find-my-circle']);

/**
 * @param {string} functionName - Netlify Function name (last URL path segment).
 * @param {Object} body - Parsed request body ({} for GET).
 * @param {Object} query - Query parameters.
 * @param {Object} headers - Request headers.
 * @returns {boolean} True when ./mockApi.js should answer.
 */
export function shouldUseMock(functionName, body = {}, query = {}, headers = {}) {
  if (USE_MOCK_API_EVERYWHERE) return true;

  const authorization = headers.Authorization || headers.authorization || '';

  if (PHONE_ROUTED.has(functionName)) {
    const phone = body.whatsapp || query.whatsapp;
    if (phone) {
      const test = isTestPhone(phone);
      if (functionName === 'send-otp' || functionName === 'verify-otp') setMockSession(test);
      return test;
    }
    return functionName === 'find-my-circle' && isMockToken(authorization);
  }

  switch (functionName) {
    case 'verify-ticket':
      return inMockSession();
    case 'create-order':
    case 'verify-payment':
      return isMockId(body.registrationId);
    case 'circle-actions':
    case 'get-circle':
      return isMockToken(authorization);
    case 'admin-auth':
      return isDemoVenueId(body.venueId);
    case 'organizer-stats':
      return isMockToken(authorization);
    default:
      return false;
  }
}
