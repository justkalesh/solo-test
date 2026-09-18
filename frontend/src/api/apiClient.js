import { API_BASE_URL } from './config';

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
 * @param {string} endpointPath - Function route path, e.g. '/auth/send-otp' or 'auth/send-otp'
 * @param {Object} [options] - Fetch options (method, body, headers, etc.)
 * @returns {Promise<*>} - Resolves with the `data` payload from the backend response.
 */
export async function apiRequest(endpointPath, options = {}) {
  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
    ...options,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, config);
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
      return responseData.data !== undefined ? responseData.data : responseData;
    } else {
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

export default {
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  ApiError,
};
