/**
 * @file netlify/functions/circle/find-my-circle.js
 * @description Circle Lookup and Attendee Portal by WhatsApp Mobile Number.
 *
 * Requires the attendee session from verify-otp (`Authorization: Bearer <token>`); the phone
 * number comes from the token. A `whatsapp` in the request that doesn't match the token gets a
 * 401 with `sessionRequired`, so the frontend verifies that number first.
 *
 * Implements:
 * - Cross-event registration lookup across past, present, and future festival nights.
 * - Circles that were merged (small advance circles, 12h before the event) resolve to the
 *   circle the attendee is in now.
 * - Access rules:
 *   - Tonight / currently live entries: Beacon access (hasBeaconAccess: true).
 *   - Past festival nights: Read-only ticket details & QR code retained; Beacon withheld.
 *   - Upcoming advance nights: View registration metadata and QR pass.
 * - Group chat is hidden for launch, so hasChatAccess is always false and chatLink null.
 */

const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { getIstTime } = require('../../shared/matching');
const { requireAttendee } = require('../../shared/session');
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
 * Netlify Function Handler: Looks up attendee registrations and calculates access tiers.
 *
 * @param {Object} event - Netlify HTTP event.
 * @param {Object} context - Netlify execution context.
 * @returns {Promise<Object>} Netlify HTTP response.
 */
exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return errorResponse('Method Not Allowed. Use GET or POST.', 405);
  }

  let whatsapp = null;

  if (event.httpMethod === 'GET') {
    whatsapp = event.queryStringParameters?.whatsapp;
  } else {
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      whatsapp = body.whatsapp;
    } catch (err) {
      return errorResponse('Invalid JSON body in request payload.', 400);
    }
  }

  const caller = requireAttendee(event);
  if (caller.response) return caller.response;

  const phone = caller.phone;
  if (whatsapp && normalizePhone(whatsapp) !== phone) {
    return errorResponse('Verify this WhatsApp number with OTP to see its circles.', 401, {
      sessionRequired: true,
    });
  }
  const ist = getIstTime();
  const todayDateString = ist.dateString;

  try {
    // Fetch ALL registrations for this number across every festival night (past, present,
    // and future). db.getRegistrationsByMobile without a date arg returns results ordered
    // by eventDate descending so the most recent night surfaces first.
    const allRegistrations = (await db.getRegistrationsByMobile(phone)) || [];

    allRegistrations.sort((a, b) => {
      const timeA = a.createdAt || (a.eventDate ? new Date(a.eventDate).getTime() : 0);
      const timeB = b.createdAt || (b.eventDate ? new Date(b.eventDate).getTime() : 0);
      return timeB - timeA;
    });

    const enrichedEntries = [];

    for (const reg of allRegistrations) {
      const eventDate = reg.eventDate || todayDateString;
      let circleDetails = null;

      if (reg.circleId) {
        circleDetails = await db.getCurrentCircleState(reg.circleId);
      }

      let accessTier = 'past';
      let hasBeaconAccess = false;
      const hasChatAccess = false; // group chat is hidden for launch
      let statusMessage = '';
      const registrationId = reg.id || reg.registrationId;
      const circleId = circleDetails?.circleId || reg.circleId || null;

      if (eventDate === todayDateString) {
        // Tonight's festival night: live access to the beacon
        accessTier = 'live';
        hasBeaconAccess = Boolean(circleId);
        statusMessage = circleId
          ? 'Active circle for tonight. Beacon enabled.'
          : 'Registered for tonight. Your circle appears here once payment is confirmed.';
      } else if (eventDate > todayDateString) {
        // Future advance booking: View-only pass
        accessTier = 'upcoming';
        hasBeaconAccess = false;
        statusMessage = circleId
          ? 'Circle assigned. The beacon unlocks on event night.'
          : 'Advance registration confirmed. Circle assignment occurs 48 hours prior to event.';
      } else {
        // Past festival night: Read-only archive; Beacon withheld
        accessTier = 'past';
        hasBeaconAccess = false;
        statusMessage = 'Past event night. Raas over, circle closed. View-only pass archived.';
      }

      const qrPassToken = `pass_${registrationId}`;

      enrichedEntries.push({
        registrationId,
        name: reg.name,
        city: reg.city,
        venue: reg.venue,
        eventDate,
        skillLevel: reg.skillLevel,
        isAllWomen: Boolean(reg.allWomenToggle),
        isCaptain: Boolean(circleDetails?.captainId && circleDetails.captainId === registrationId),
        circleId,
        circleName: circleDetails?.name || null,
        meetingPoint: hasBeaconAccess ? (circleDetails?.meetingPoint || null) : null,
        chatLink: null,
        qrPassToken,
        accessTier,
        hasBeaconAccess,
        hasChatAccess,
        statusMessage,
        paymentStatus: reg.paymentStatus || 'pending',
        createdAt: reg.createdAt,
      });
    }

    return successResponse({
      whatsapp: phone,
      todayDate: todayDateString,
      totalEntries: enrichedEntries.length,
      registrations: enrichedEntries,
    });
  } catch (error) {
    console.error('[find-my-circle fatal error]', error);
    return errorResponse(
      error.message || 'Internal server error while looking up circles.',
      500
    );
  }
};
