/**
 * @file netlify/functions/otp/verify-otp.js
 * @description OTP Verification Handler for SoloSaathi Circle.
 *
 * Enforces:
 * - Schema validation via validateOtpVerifyPayload.
 * - Anti-fraud 5-attempt hard block (OTP_MAX_VERIFY_ATTEMPTS = 5):
 *   If 5 wrong attempts occur, the code is permanently locked with NO manual override.
 *   This is an intentional anti-fraud defense to prevent bad actors from registering on numbers
 *   they do not control and subsequently disputing charges.
 * - TTL verification: OTP must be verified within OTP_EXPIRY_MINUTES (10m).
 * - On success: Persists verified session state via db.saveVerifiedStatus with OTP_VERIFIED_TTL_MINUTES (30m).
 */

const {
  OTP_MAX_VERIFY_ATTEMPTS,
  OTP_VERIFIED_TTL_MINUTES,
} = require('../../shared/constants');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { validateOtpVerifyPayload } = require('../../shared/validators');
const db = require('../../shared/db');

/**
 * Normalizes phone input to standard 10 digits.
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
 * Netlify Function Handler: Validates submitted OTP and sets verified status.
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
  const validation = validateOtpVerifyPayload(body);
  if (!validation.valid) {
    return errorResponse(validation.errors.join('; '), 400, validation.errors);
  }

  const phone = normalizePhone(body.whatsapp);
  const submittedCode = String(body.code).trim();
  const now = Date.now();

  try {
    // 2. Fetch active OTP record
    const otpRecord = await db.getOtpRecord(phone);

    if (!otpRecord || !otpRecord.code) {
      return errorResponse(
        'No active verification code found for this mobile number. Please request a new OTP.',
        400
      );
    }

    // 3. Check if already hard-blocked
    if (otpRecord.isBlocked) {
      return errorResponse(
        'This OTP is permanently locked due to 5 failed verification attempts. No manual override is permitted. Please request a new OTP.',
        403,
        { hardBlocked: true }
      );
    }

    // 4. Check expiration
    if (now > otpRecord.expiresAt) {
      return errorResponse(
        'The verification code has expired (valid for 10 minutes). Please request a fresh OTP.',
        400,
        { expired: true }
      );
    }

    // 5. Code comparison
    if (otpRecord.code !== submittedCode) {
      const currentAttempts = (otpRecord.attempts || 0) + 1;

      if (currentAttempts >= OTP_MAX_VERIFY_ATTEMPTS) {
        // Enforce permanent hard block
        await db.saveOtpRecord(phone, {
          ...otpRecord,
          attempts: currentAttempts,
          isBlocked: true,
        });

        return errorResponse(
          'Maximum verification attempts (5) exceeded. This OTP is permanently locked. No manual override is permitted to prevent festival ticket fraud.',
          403,
          {
            hardBlocked: true,
            attempts: currentAttempts,
          }
        );
      }

      // Record failed attempt and compute remaining tries
      await db.saveOtpRecord(phone, {
        ...otpRecord,
        attempts: currentAttempts,
      });

      const attemptsRemaining = OTP_MAX_VERIFY_ATTEMPTS - currentAttempts;
      return errorResponse(
        `Invalid verification code. ${attemptsRemaining} attempt(s) remaining before permanent lockout.`,
        400,
        { attemptsRemaining }
      );
    }

    // 6. Verification Success: persist 30-minute verified session
    await db.saveVerifiedStatus(phone, now);

    // Invalidate the consumed OTP code so it cannot be replayed
    await db.saveOtpRecord(phone, {
      ...otpRecord,
      code: null,
      expiresAt: 0,
      attempts: 0,
      isBlocked: false,
      consumedAt: now,
    });

    return successResponse({
      verified: true,
      whatsapp: phone,
      verifiedTtlMinutes: OTP_VERIFIED_TTL_MINUTES,
      message:
        'Mobile number verified successfully. You have 30 minutes to complete registration without re-verifying.',
    });
  } catch (error) {
    console.error('[verify-otp fatal error]', error);
    return errorResponse(
      error.message || 'Internal server error during OTP verification.',
      500
    );
  }
};
