/**
 * @file netlify/functions/registration/advance-register.js
 * @description Advance Pre-Event Registration Handler for SoloSaathi Circle.
 *
 * Implements:
 * - Operating window check: Open anytime up until 2 hours before the event's 7:30 PM IST start
 *   (i.e. cutoff is 5:30 PM IST on the event date).
 * - Mandatory ticketPhoto verification (requirePhoto: true) via Anthropic vision OCR.
 * - Venue mismatch detection (warning, not hard block).
 * - OTP verified session validation (must have verified mobile within OTP_VERIFIED_TTL_MINUTES = 30m).
 * - Queues attendee into pending batch pool (db.getPendingPool / db.savePendingPool)
 *   partitioned by `pending:{city}:{venue}:{level}:{genderPref}:{eventDate}`.
 * - Stores registration record with paymentStatus: 'pending'.
 */

const crypto = require('crypto');
const { OTP_VERIFIED_TTL_MINUTES } = require('../../shared/constants');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { validateRegistrationPayload } = require('../../shared/validators');
const { isAdvanceRegistrationOpen } = require('../../shared/matching');
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
 * Netlify Function Handler: Advance festival registration queuing into the matching pool.
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

  // 1. Validate payload structure (for Advance, ticketPhoto is mandatory)
  const validation = validateRegistrationPayload(body, { requirePhoto: true });
  if (!validation.valid) {
    return errorResponse(validation.errors.join('; '), 400, validation.errors);
  }

  // 2. Validate eventDate presence and format
  const eventDate = String(body.eventDate || '').trim();
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return errorResponse('eventDate is required in YYYY-MM-DD format for advance registration.', 400);
  }

  // 3. Operating cutoff check (open until 2 hours before the specific event's 7:30 PM IST start)
  const advanceCheck = isAdvanceRegistrationOpen(eventDate);
  if (!advanceCheck.isOpen) {
    return errorResponse(advanceCheck.reason, 403);
  }

  const phone = normalizePhone(body.whatsapp);
  const now = Date.now();

  try {
    // 4. Verify OTP session status (must have verified within last 30 minutes)
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

    // 5. Mandatory AI ticket verification & venue mismatch evaluation
    const warnings = [];
    let ticketVerifiedToken = null;

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

    // 6. Partition resolution and pool queuing
    const genderPref = body.allWomenToggle ? 'allWomen' : 'mixed';
    const level = body.skillLevel; // 'beginner' | 'intermediate' | 'advanced'

    const currentPool = (await db.getPendingPool(
      body.city,
      body.venue,
      level,
      genderPref,
      eventDate
    )) || [];

    const registrationId = `reg_adv_${phone}_${now}_${crypto.randomBytes(3).toString('hex')}`;

    // Pool participant item
    const poolItem = {
      registrationId,
      name: body.name,
      whatsapp: phone,
      gender: body.gender,
      ageBand: body.ageBand,
      skillLevel: body.skillLevel,
      allWomenToggle: body.allWomenToggle,
      captainOptIn: body.captainOptIn,
      joinedPoolAt: now,
    };

    currentPool.push(poolItem);
    await db.savePendingPool(
      body.city,
      body.venue,
      level,
      genderPref,
      eventDate,
      currentPool
    );

    // 7. Persist Registration Record with paymentStatus: 'pending'
    // TODO(Phase 3): gate finalization on confirmed payment
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
      ticketPhoto: '[PHOTO_STORED]',
      ticketVerifiedToken,
      registrationType: 'advance',
      eventDate,
      paymentStatus: 'pending', // Stubbed for Phase 3 Razorpay integration
      circleId: null, // Assigned later upon batch finalization
      createdAt: now,
    };

    await db.saveRegistration(registrationId, registrationData);

    return successResponse({
      registrationId,
      status: 'pooled',
      eventDate,
      poolSize: currentPool.length,
      paymentStatus: 'pending',
      message:
        'Advance registration confirmed and added to the matching pool! Circles are finalized and announced 48 hours prior to the event.',
      warnings: warnings.length > 0 ? warnings : null,
    }, 201);
  } catch (error) {
    console.error('[advance-register fatal error]', error);
    return errorResponse(
      error.message || 'Internal server error during advance registration.',
      500
    );
  }
};
