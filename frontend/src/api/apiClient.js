import { API_BASE_URL } from './config';
import { normalizePhone, readTokenPayload, shouldUseMock } from './mockMode';

// ---------------------------------------------------------------------------
// Attendee sessions: verify-otp returns a signed token that find-my-circle, circle-actions and
// get-circle require. Tokens are kept per phone number in localStorage (12-hour expiry) and
// attached automatically.
// ---------------------------------------------------------------------------
const SESSION_STORAGE_KEY = 'solosaathi_attendee_sessions';
const CURRENT_SESSION_KEY = 'solosaathi_attendee_phone';
const SESSION_ENDPOINTS = new Set(['find-my-circle', 'circle-actions', 'get-circle']);

function readSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeSessions(sessions) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Storage blocked: the session lasts until the page is closed
  }
}

function saveAttendeeSession(phone, token) {
  const key = normalizePhone(phone);
  if (!key || !token) return;
  writeSessions({ ...readSessions(), [key]: token });
  try {
    localStorage.setItem(CURRENT_SESSION_KEY, key);
  } catch {
    // ignore
  }
}

/** Forgets the stored session for a number (or the current one). */
export function clearAttendeeSession(phone) {
  const key = phone ? normalizePhone(phone) : getCurrentSessionPhone();
  if (!key) return;
  const sessions = readSessions();
  delete sessions[key];
  writeSessions(sessions);
}

/** The number verified most recently in this browser, or null. */
export function getCurrentSessionPhone() {
  try {
    return localStorage.getItem(CURRENT_SESSION_KEY);
  } catch {
    return null;
  }
}

/**
 * The unexpired session token for a number (defaults to the most recently verified number).
 *
 * @param {string} [phone]
 * @returns {string|null}
 */
export function getAttendeeSession(phone) {
  const key = phone ? normalizePhone(phone) : getCurrentSessionPhone();
  const token = key ? readSessions()[key] : null;
  if (!token) return null;
  const payload = readTokenPayload(token);
  if (!payload || !payload.exp || Date.now() > payload.exp) {
    clearAttendeeSession(key);
    return null;
  }
  return token;
}

export const hasAttendeeSession = (phone) => Boolean(getAttendeeSession(phone));

/**
 * Custom Error class representing an API or Serverless Function failure.
 */
export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Standard HTTP request wrapper connecting the frontend to Netlify Functions.
 *
 * Enforces standardized response parsing matching `netlify/shared/response.js`:
 * - Success: `{ success: true, data: ... }` => resolves with `data`
 * - Error:   `{ success: false, error: "...", details: ... }` => throws `ApiError`
 *
 * Test contact details are answered by the in-browser demo backend (see ./mockMode.js).
 *
 * @param {string} endpointPath - Function route path, e.g. '/auth/send-otp' or 'auth/send-otp'
 * @param {Object} [options] - Fetch options (method, body, headers, etc.). `sessionPhone` picks
 *   which verified number's session to send; it defaults to the request's `whatsapp`, then the
 *   most recently verified number.
 * @returns {Promise<*>} - Resolves with the `data` payload from the backend response.
 */
export async function apiRequest(endpointPath, options = {}) {
  let url;
  if (endpointPath.startsWith('http://') || endpointPath.startsWith('https://')) {
    url = endpointPath;
  } else if (endpointPath.startsWith('/.netlify/functions/')) {
    const fnName = endpointPath.replace('/.netlify/functions/', '');
    url = `${API_BASE_URL}/${fnName}`;
  } else {
    const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
    url = `${API_BASE_URL}${cleanPath}`;
  }

  // Handle query parameters
  if (options.params && typeof options.params === 'object') {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const functionName = url.split('?')[0].split('/').filter(Boolean).pop();
  const requestBody =
    options.body && typeof options.body === 'object' && !(options.body instanceof FormData)
      ? options.body
      : {};

  const { sessionPhone, ...fetchOptions } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {}),
  };
  if (SESSION_ENDPOINTS.has(functionName) && !headers.Authorization && !headers.authorization) {
    const preferredPhone = sessionPhone || requestBody.whatsapp || options.params?.whatsapp;
    const token = (preferredPhone && getAttendeeSession(preferredPhone)) || getAttendeeSession();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    method: fetchOptions.method || 'GET',
    ...fetchOptions,
    headers,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    const useMock = shouldUseMock(functionName, requestBody, options.params || {}, headers);
    response = useMock
      ? await (await import('./mockApi')).mockFetch(url, config)
      : await fetch(url, config);
  } catch (networkError) {
    throw new ApiError(
      'Unable to connect to SoloSaathi servers. Please check your network connection.',
      0,
      networkError.message
    );
  }

  let responseData;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    const text = await response.text();
    responseData = { error: text };
  }

  // If backend formatted via netlify/shared/response.js:
  if (responseData && typeof responseData === 'object' && 'success' in responseData) {
    if (responseData.success === true) {
      const data = responseData.data !== undefined ? responseData.data : responseData;
      if (functionName === 'verify-otp' && data && data.sessionToken) {
        saveAttendeeSession(data.whatsapp || requestBody.whatsapp, data.sessionToken);
      }
      return data;
    } else {
      if (response.status === 401 && responseData.details?.sessionRequired) {
        clearAttendeeSession(sessionPhone || requestBody.whatsapp);
      }
      throw new ApiError(
        responseData.error || 'A server error occurred. Please try again.',
        response.status,
        responseData.details || null
      );
    }
  }

  // Non-standard response fallback
  if (!response.ok) {
    const message =
      (responseData && (responseData.error || responseData.message)) ||
      `Request failed with status ${response.status} (${response.statusText})`;
    throw new ApiError(message, response.status, responseData);
  }

  return responseData;
}

// Convenience helper methods
export const apiGet = (path, options = {}) =>
  apiRequest(path, { ...options, method: 'GET' });

export const apiPost = (path, body, options = {}) =>
  apiRequest(path, { ...options, method: 'POST', body });

export const apiPut = (path, body, options = {}) =>
  apiRequest(path, { ...options, method: 'PUT', body });

export const apiDelete = (path, options = {}) =>
  apiRequest(path, { ...options, method: 'DELETE' });

// Aliases matching alternative naming conventions
export const getRequest = (path, params, options = {}) =>
  apiGet(path, { ...options, params });

export const postRequest = (path, body, options = {}) =>
  apiPost(path, body, options);

export default {
  apiRequest,
  getAttendeeSession,
  hasAttendeeSession,
  clearAttendeeSession,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  getRequest,
  postRequest,
  ApiError,
};
