/**
 * @file netlify/shared/response.js
 * @description Standardized HTTP response formatters and CORS preflight helpers for Netlify Functions.
 *
 * Enforces uniform response schemas across all serverless API endpoints:
 * - Success payloads: `{ success: true, data: ... }`
 * - Error payloads: `{ success: false, error: "message", details: ... }`
 * CORS allows config.ALLOWED_ORIGIN (set it to the production site URL; '*' only for local dev).
 */

const config = require('../config/env');

/**
 * Creates a standardized HTTP 2xx success response for Netlify Functions.
 *
 * @param {*} data - Response data payload to serialize into the response body.
 * @param {number} [statusCode=200] - HTTP status code (e.g., 200 OK, 201 Created).
 * @returns {{statusCode: number, headers: Object<string, string>, body: string}}
 */
function successResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': config.ALLOWED_ORIGIN,
    },
    body: JSON.stringify({
      success: true,
      data,
    }),
  };
}

/**
 * Creates a standardized HTTP 4xx/5xx error response for Netlify Functions.
 *
 * @param {string} message - Human-readable error message explaining the failure.
 * @param {number} [statusCode=400] - HTTP status code (e.g., 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error).
 * @param {*} [details=null] - Optional machine-readable or field-specific validation failure details.
 * @returns {{statusCode: number, headers: Object<string, string>, body: string}}
 */
function errorResponse(message, statusCode = 400, details = null) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': config.ALLOWED_ORIGIN,
    },
    body: JSON.stringify({
      success: false,
      error: message,
      details,
    }),
  };
}

/**
 * Creates a CORS preflight response for HTTP OPTIONS requests.
 *
 * @returns {{statusCode: number, headers: Object<string, string>, body: string}}
 */
function handleOptions() {
  return {
    statusCode: 204,
    headers: {
      'Access-Control-Allow-Origin': config.ALLOWED_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
    body: '',
  };
}

module.exports = {
  successResponse,
  errorResponse,
  handleOptions,
};
