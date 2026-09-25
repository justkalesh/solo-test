/**
 * @file netlify/functions/otp/send-otp.js
 * @description OTP Generation and Dispatch Handler for SoloSaathi Circle.
 *
 * Enforces:
 * - Request validation via validateOtpSendPayload.
 * - Rate limiting: OTP_RESEND_COOLDOWN_SECONDS (30s) between successive sends.
 * - Window capping: OTP_MAX_SENDS_PER_WINDOW (3) per OTP_SEND_WINDOW_MINUTES (15m).
 * - Lockout: after OTP_MAX_VERIFY_ATTEMPTS wrong codes, no new OTP for OTP_LOCKOUT_MINUTES (15m).
 * - Generation: Cryptographically secure 6-digit numeric code with OTP_EXPIRY_MINUTES (10m) TTL.
 * - Channel routing: Primary dispatch via WhatsApp Business API, automatic fallback to SMS.
 */

const crypto = require('crypto');
const {
  OTP_CODE_LENGTH,
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_SENDS_PER_WINDOW,
  OTP_SEND_WINDOW_MINUTES,
  OTP_LOCKOUT_MINUTES,
} = require('../../shared/constants');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { validateOtpSendPayload } = require('../../shared/validators');
const { sendWhatsAppMessage, sendSmsMessage } = require('../../shared/whatsapp');
const db = require('../../shared/db');

/**
 * Normalizes an Indian mobile phone number to standard 10 digits.
 *
 * @param {*} phone - Raw phone input.
 * @returns {string} 10-digit mobile number string.
 */
function normalizePhone(phone) {
  const digits = String(phone || '').trim().replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Netlify Function Handler: Generates and dispatches a 6-digit verification code.
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

  // 1. Schema validation
  const validation = validateOtpSendPayload(body);
  if (!validation.valid) {
    return errorResponse(validation.errors.join('; '), 400, validation.errors);
  }

  const phone = normalizePhone(body.whatsapp);
  const now = Date.now();

  try {
    // 2. Temporary lockout after too many wrong codes (brute-force protection)
    const existingOtpRecord = await db.getOtpRecord(phone);
    if (existingOtpRecord && existingOtpRecord.isBlocked) {
      const lockoutEndsAt = (existingOtpRecord.blockedAt || 0) + OTP_LOCKOUT_MINUTES * 60 * 1000;
      if (now < lockoutEndsAt) {
        const minutesLeft = Math.ceil((lockoutEndsAt - now) / 60000);
        return errorResponse(
          `Too many wrong codes. For your security, please try again in ${minutesLeft} minute(s).`,
          429,
          { hardBlocked: true, lockoutMinutesRemaining: minutesLeft }
        );
      }
    }

    // 3. Rate-limiting check
    const rateLimit = await db.getOtpRateLimit(phone);
    let currentCount = 1;
    let windowStartTime = now;

    if (rateLimit) {
      // Check 30-second cooldown between successive sends
      if (rateLimit.lastSentAt && now - rateLimit.lastSentAt < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
        const cooldownRemaining = Math.ceil(
          (OTP_RESEND_COOLDOWN_SECONDS * 1000 - (now - rateLimit.lastSentAt)) / 1000
        );
        return errorResponse(
          `Please wait ${cooldownRemaining} second(s) before requesting another OTP.`,
          429,
          { cooldownRemainingSeconds: cooldownRemaining }
        );
      }

      // Check 15-minute rolling send window
      const windowElapsed = now - (rateLimit.windowStartTime || now);
      if (windowElapsed < OTP_SEND_WINDOW_MINUTES * 60 * 1000) {
        if (rateLimit.count >= OTP_MAX_SENDS_PER_WINDOW) {
          const resetSeconds = Math.ceil(
            (OTP_SEND_WINDOW_MINUTES * 60 * 1000 - windowElapsed) / 1000
          );
          return errorResponse(
            `Maximum of ${OTP_MAX_SENDS_PER_WINDOW} OTP requests reached for this 15-minute window. Please try again later.`,
            429,
            { windowResetSeconds: resetSeconds }
          );
        }
        currentCount = rateLimit.count + 1;
        windowStartTime = rateLimit.windowStartTime;
      } else {
        // Window expired, reset counter
        currentCount = 1;
        windowStartTime = now;
      }
    }

    // 4. Generate random 6-digit numeric OTP
    const minCode = Math.pow(10, OTP_CODE_LENGTH - 1);
    const maxCode = Math.pow(10, OTP_CODE_LENGTH);
    const otpCode = crypto.randomInt(minCode, maxCode).toString();
    const expiresAt = now + OTP_EXPIRY_MINUTES * 60 * 1000;

    // 5. Store OTP record and update rate-limit state in database
    await db.saveOtpRecord(phone, {
      code: otpCode,
      expiresAt,
      attempts: 0,
      isBlocked: false,
      createdAt: now,
    });

    await db.saveOtpRateLimit(phone, {
      count: currentCount,
      windowStartTime,
      lastSentAt: now,
    });

    // 6. Dispatch message: WhatsApp primary with SMS fallback
    let deliveryChannel = 'whatsapp';
    const whatsappResult = await sendWhatsAppMessage(phone, 'otp_verification', [otpCode]);

    if (!whatsappResult.success) {
      console.warn(
        `[OTP] Primary WhatsApp dispatch failed for ***${phone.slice(-4)}: ${whatsappResult.error}. Triggering SMS fallback...`
      );
      const smsMessage = `Your SoloSaathi Circle verification code is ${otpCode}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Never share this code.`;
      const smsResult = await sendSmsMessage(phone, smsMessage);
      deliveryChannel = 'sms';

      if (!smsResult.success) {
        console.error(`[OTP] SMS fallback also failed for ***${phone.slice(-4)}: ${smsResult.error}`);
        return errorResponse(
          'Unable to deliver verification code via WhatsApp or SMS. Please check your phone connection and try again.',
          502,
          {
            whatsappError: whatsappResult.error,
            smsError: smsResult.error,
          }
        );
      }
    }

    return successResponse({
      message: 'Verification code dispatched successfully.',
      deliveryChannel,
      cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error('[send-otp fatal error]', error);
    return errorResponse(
      error.message || 'Internal server error during OTP dispatch.',
      500
    );
  }
};
