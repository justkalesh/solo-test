/**
 * @file netlify/functions/registration/register.js
 * @description Live Walk-Up Festival Registration Handler for SoloSaathi Circle.
 *
 * Implements:
 * - Operating window check: Open on/after LIVE_SEASON_START_DATE ('2026-10-13') during
 *   daily window 6:30 PM to 1:30 AM IST (window wraps past midnight).
 * - OTP verified status check: Verifies that the mobile completed OTP verification within OTP_VERIFIED_TTL_MINUTES (30m).
 * - Flexible ticket proof: Accepts either ticketSerial string OR ticketPhoto base64 string.
 * - AI ticket extraction & venue mismatch warning (if photo provided).
 * - Instant circle matching engine:
 *   - Gender cap enforcement (max 10 declared per gender in mixed circles).
 *   - Soft capacity cap (SOFT_MAX_GROUP = 24).
 *   - Captain assignment.
 * - Stores registration with paymentStatus: 'pending'.
 */

const crypto = require('crypto');
const { OTP_VERIFIED_TTL_MINUTES } = require('../../shared/constants');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { validateRegistrationPayload } = require('../../shared/validators');
const { isLiveRegistrationOpen } = require('../../shared/matching');
const {
  extractTicketInfo,
  checkVenueMismatch,
} = require('../ticket-verification/verify-ticket');
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
 * Netlify Function Handler: Live festival attendee registration draft creation.
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

  // 1. Validate payload structure (for Live, requirePhoto is false — accepts serial OR photo)
  const validation = validateRegistrationPayload(body, { requirePhoto: false });
  if (!validation.valid) {
    return errorResponse(validation.errors.join('; '), 400, validation.errors);
  }

  // 2. Check live registration window (6:30 PM to 1:30 AM IST on/after 2026-10-13)
  const windowCheck = isLiveRegistrationOpen();
  if (!windowCheck.isOpen) {
    return errorResponse(windowCheck.reason, 403);
  }
  const festivalDate = windowCheck.festivalDate;

  const phone = normalizePhone(body.whatsapp);
  const now = Date.now();

  try {
    // 3. Verify OTP completion status (must be verified within last 30 minutes)
    const verifiedStatus = await db.getVerifiedStatus(phone);
    if (!verifiedStatus || !verifiedStatus.verified) {
      return errorResponse(
        'Mobile number has not completed OTP verification. Please verify with OTP before registering.',
        401
      );
    }

    const verifiedElapsed = now - (verifiedStatus.verifiedAt || 0);
    if (verifiedElapsed > OTP_VERIFIED_TTL_MINUTES * 60 * 1000) {
      return errorResponse(
        'Your OTP verification session has expired. Please verify your mobile number again.',
        401,
        { expired: true }
      );
    }

    // 4. Ticket verification: if photo supplied, perform AI OCR extraction & venue mismatch check
    const warnings = [];
    let ticketVerifiedToken = null;

    if (body.ticketPhoto && typeof body.ticketPhoto === 'string') {
      try {
        const ticketInfo = await extractTicketInfo(body.ticketPhoto);
        ticketVerifiedToken = ticketInfo.ticketVerifiedToken;

        const mismatch = checkVenueMismatch(
          ticketInfo.venue || ticketInfo.venue_english,
          body.venue
        );
        if (mismatch.hasMismatch) {
          warnings.push(mismatch.warning);
        }
      } catch (ticketErr) {
        console.warn('[Ticket OCR Non-Fatal Warning]', ticketErr.message);
      }
    }

    // 5. Generate registration draft ID
    const registrationId = `reg_live_${phone}_${now}_${crypto.randomBytes(3).toString('hex')}`;

    // 6. Persist Registration Record with paymentStatus: 'pending'
    // GATED PAYMENT ENFORCEMENT (Phase 3):
    // Registration writes a pending record first without circle allocation (circleId: null).
    // The attendee enters circle matching only AFTER payment signature verification succeeds
    // in verify-payment.js or webhook.js.
    const registrationData = {
      id: registrationId,
      name: body.name,
      whatsapp: phone,
      city: body.city,
      venue: body.venue,
      gender: body.gender,
      ageBand: body.ageBand,
      skillLevel: body.skillLevel,
      allWomenToggle: body.allWomenToggle,
      captainOptIn: body.captainOptIn,
      ticketSerial: body.ticketSerial || null,
      ticketPhoto: body.ticketPhoto ? '[PHOTO_STORED]' : null,
      ticketVerifiedToken,
      registrationType: 'live',
      eventDate: festivalDate,
      paymentStatus: 'pending',
      circleId: null, // Assigned upon confirmed payment
      createdAt: now,
    };

    await db.saveRegistration(registrationId, registrationData);

    return successResponse({
      registrationId,
      paymentStatus: 'pending',
      eventDate: festivalDate,
      city: body.city,
      venue: body.venue,
      registrationType: 'live',
      warnings: warnings.length > 0 ? warnings : null,
      nextStep: {
        action: 'create_order',
        endpoint: '/.netlify/functions/create-order',
        params: { registrationId },
      },
      message: 'Live registration draft created. Please proceed to payment to enter your festival circle.',
    }, 201);
  } catch (error) {
    console.error('[register-live fatal error]', error);
    return errorResponse(
      error.message || 'Internal server error during live registration.',
      500
    );
  }
};
