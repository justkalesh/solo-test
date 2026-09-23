/**
 * @file netlify/config/env.js
 * @description Centralized Environment Configuration for SoloSaathi Circle.
 *
 * This module is the single source of truth for all environment variables used across
 * every phase of the SoloSaathi Circle backend (authentication, WhatsApp BSP, SMS fallback,
 * Google Gemini AI ticket vision, Razorpay payments, and OTP developer controls).
 *
 * It prevents downstream modules from directly referencing `process.env` and enforces
 * fail-fast validation on cold-start: if any mandatory variable is missing, an explicit
 * Error is thrown immediately rather than causing intermittent failures during user requests.
 */

// List of mandatory environment variables required across backend phases.
const REQUIRED_ENV_VARS = [
  'ADMIN_SECRET',
  'WHATSAPP_API_KEY',
  'WHATSAPP_API_URL',
  'GEMINI_API_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'TICKET_TOKEN_SECRET',
  'FIREBASE_SERVICE_ACCOUNT',
];

// Identify any missing required environment variables.
const missingRequired = REQUIRED_ENV_VARS.filter((key) => {
  const value = process.env[key];
  return value === undefined || value === null || String(value).trim() === '';
});

if (missingRequired.length > 0) {
  throw new Error(
    `[SoloSaathi Config Fatal Error] Missing required environment variable(s): ${missingRequired.join(
      ', '
    )}. Ensure these are configured in your Netlify site settings or environment file.`
  );
}

// Optional SMS variables (SMS is a secondary fallback channel if WhatsApp fails).
const OPTIONAL_SMS_VARS = ['SMS_API_KEY', 'SMS_API_URL', 'SMS_DLT_TEMPLATE_ID'];
const missingSms = OPTIONAL_SMS_VARS.filter((key) => {
  const value = process.env[key];
  return value === undefined || value === null || String(value).trim() === '';
});

if (missingSms.length > 0) {
  console.warn(
    `[SoloSaathi Config Warning] Missing optional SMS fallback environment variable(s): ${missingSms.join(
      ', '
    )}. SMS delivery will be disabled until configured.`
  );
}

// Parse OTP_DEV_MODE boolean flag (defaults to false if unset or not explicitly 'true' / '1').
const isOtpDevMode =
  process.env.OTP_DEV_MODE === 'true' || process.env.OTP_DEV_MODE === '1';

if (isOtpDevMode) {
  console.warn(
    '[SoloSaathi Config Warning] OTP_DEV_MODE is enabled! OTP codes will be printed to logs instead of sent via WhatsApp/SMS. DO NOT USE IN PRODUCTION.'
  );
}

/**
 * Frozen application configuration object.
 */
const config = Object.freeze({
  ADMIN_SECRET: process.env.ADMIN_SECRET,
  WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY,
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL,
  SMS_API_KEY: process.env.SMS_API_KEY || '',
  SMS_API_URL: process.env.SMS_API_URL || '',
  SMS_DLT_TEMPLATE_ID: process.env.SMS_DLT_TEMPLATE_ID || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  TICKET_TOKEN_SECRET: process.env.TICKET_TOKEN_SECRET,
  FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT,
  OTP_DEV_MODE: isOtpDevMode,
});

module.exports = config;
