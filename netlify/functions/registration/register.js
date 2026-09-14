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
const {
  OTP_VERIFIED_TTL_MINUTES,
  SOFT_MAX_GROUP,
} = require('../../shared/constants');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { validateRegistrationPayload } = require('../../shared/validators');
const {
  buildCircleId,
  shouldStartNewBucket,
  checkGenderCap,
  isLiveRegistrationOpen,
} = require('../../shared/matching');
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
 * Netlify Function Handler: Live festival attendee registration and instant circle matching.
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

    // 5. Partition resolution
    const genderPref = body.allWomenToggle ? 'allWomen' : 'mixed';
    const level = body.skillLevel; // 'beginner' | 'intermediate' | 'advanced'

    // Fetch existing live partition state for tonight
    let groupState = await db.getGroupState(
      body.city,
      body.venue,
      level,
      genderPref,
      festivalDate
    );

    let activeCircleId = groupState?.activeCircleId || null;
    let circleCounter = groupState?.lastCircleCounter || 0;
    let circleState = null;

    if (activeCircleId) {
      circleState = await db.getCircleState(activeCircleId);
    }

    // Determine if we need to start a brand new circle
    let needNewCircle = false;

    if (!circleState || circleState.status === 'locked' || circleState.status === 'closed') {
      needNewCircle = true;
    } else {
      // Check soft group capacity (24)
      if (shouldStartNewBucket(circleState)) {
        needNewCircle = true;
      }
      // Check gender cap in mixed circle
      const genderViolated = checkGenderCap(
        { male: circleState.maleCount, female: circleState.femaleCount },
        body.gender,
        body.allWomenToggle
      );
      if (genderViolated) {
        needNewCircle = true;
      }
    }

    // Create a new circle if needed
    if (needNewCircle) {
      circleCounter += 1;
      activeCircleId = buildCircleId(level, genderPref, circleCounter);
      circleState = {
        circleId: activeCircleId,
        name: `${activeCircleId.replace('-', ' ')}`,
        skillLevel: level,
        isAllWomen: body.allWomenToggle,
        city: body.city,
        venue: body.venue,
        eventDate: festivalDate,
        captainId: null,
        captainName: null,
        meetingPoint: 'Near Main Festival Entrance / Information Desk',
        chatLink: `https://chat.whatsapp.com/demo_${activeCircleId.toLowerCase()}`,
        members: [],
        maleCount: 0,
        femaleCount: 0,
        otherCount: 0,
        totalCount: 0,
        status: 'active',
        isLocked: false,
        createdAt: now,
      };
    }

    // 6. Generate registration record
    const registrationId = `reg_live_${phone}_${now}_${crypto.randomBytes(3).toString('hex')}`;

    // Evaluate Circle Captain assignment
    let isCaptain = false;
    if (body.captainOptIn && !circleState.captainId) {
      isCaptain = true;
      circleState.captainId = registrationId;
      circleState.captainName = body.name;
    }

    // Member object added to circle roster
    const newMember = {
      registrationId,
      name: body.name,
      gender: body.gender,
      ageBand: body.ageBand,
      skillLevel: body.skillLevel,
      captainOptIn: body.captainOptIn,
      isCaptain,
      joinedAt: now,
    };

    circleState.members.push(newMember);
    circleState.totalCount = circleState.members.length;
    if (body.gender === 'male') circleState.maleCount = (circleState.maleCount || 0) + 1;
    else if (body.gender === 'female') circleState.femaleCount = (circleState.femaleCount || 0) + 1;
    else circleState.otherCount = (circleState.otherCount || 0) + 1;

    // Fallback: if circle still has no captain and members exist, designate the first attendee
    if (!circleState.captainId && circleState.members.length > 0) {
      circleState.captainId = circleState.members[0].registrationId;
      circleState.captainName = circleState.members[0].name;
      circleState.members[0].isCaptain = true;
    }

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
      ticketPhoto: body.ticketPhoto ? '[PHOTO_STORED]' : null,
      ticketVerifiedToken,
      registrationType: 'live',
      eventDate: festivalDate,
      paymentStatus: 'pending', // Stubbed for Phase 3 Razorpay integration
      circleId: activeCircleId,
      createdAt: now,
    };

    await db.saveRegistration(registrationId, registrationData);
    await db.saveCircleState(activeCircleId, circleState);

    // Update group partition tracking state
    await db.saveGroupState(body.city, body.venue, level, genderPref, festivalDate, {
      activeCircleId,
      lastCircleCounter: circleCounter,
      updatedAt: now,
    });

    return successResponse({
      registrationId,
      circleId: activeCircleId,
      circle: {
        id: activeCircleId,
        name: circleState.name,
        meetingPoint: circleState.meetingPoint,
        chatLink: circleState.chatLink,
        isCaptain,
        totalMembers: circleState.totalCount,
      },
      paymentStatus: 'pending',
      warnings: warnings.length > 0 ? warnings : null,
    }, 201);
  } catch (error) {
    console.error('[register-live fatal error]', error);
    return errorResponse(
      error.message || 'Internal server error during live registration.',
      500
    );
  }
};
