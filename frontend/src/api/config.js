/**
 * SoloSaathi Circle — API Configuration
 *
 * Resolves the backend base URL for Netlify Functions.
 *
 * In local development with Netlify CLI (`netlify dev`), functions run at:
 *   http://localhost:8888/.netlify/functions
 *
 * In production on Netlify:
 *   `VITE_API_BASE_URL` is set in Netlify's Site Settings > Environment Variables,
 *   or omitted to default to `/.netlify/functions` (same-origin).
 *
 * NEVER hardcode production server URLs directly in committed code.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8888/.netlify/functions'
    : '/.netlify/functions');

export default {
  API_BASE_URL,
};
