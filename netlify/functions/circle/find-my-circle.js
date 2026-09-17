/**
 * @file netlify/functions/circle/find-my-circle.js
 * @description Circle Lookup and Attendee Portal by WhatsApp Mobile Number.
 *
 * Implements:
 * - Cross-event registration lookup across past, present, and future festival nights.
 * - Access rules:
 *   - Tonight / currently live entries: Full Beacon and Chat link access (hasBeaconAccess: true, hasChatAccess: true).
 *   - Past festival nights: Read-only ticket details & QR code retained; Beacon and Chat links strictly withheld
 *     (hasBeaconAccess: false, hasChatAccess: false).
 *   - Upcoming advance nights: View registration metadata and QR pass; chat links pending batch finalization.
 */

const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { getIstTime } = require('../../shared/matching');
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

  if (!whatsapp) {
    return errorResponse("Missing required parameter 'whatsapp'.", 400);
  }

  const phone = normalizePhone(whatsapp);
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
        circleDetails = await db.getCircleState(reg.circleId);
      }

      let accessTier = 'past';
      let hasBeaconAccess = false;
      let hasChatAccess = false;
      let statusMessage = '';

      if (eventDate === todayDateString) {
        // Tonight's festival night: Full live access to beacon and chat
        accessTier = 'live';
        hasBeaconAccess = true;
        hasChatAccess = Boolean(circleDetails?.chatLink);
        statusMessage = 'Active circle for tonight. Beacon and Group Chat enabled.';
      } else if (eventDate > todayDateString) {
        // Future advance booking: View-only pass, chat unlocks on finalization
        accessTier = 'upcoming';
        hasBeaconAccess = false;
        hasChatAccess = false;
        statusMessage = reg.circleId
          ? 'Circle assigned. Beacon and group chat unlock on event night.'
          : 'Advance registration confirmed. Circle assignment occurs 48 hours prior to event.';
      } else {
        // Past festival night: Read-only archive; Beacon and Chat withheld
        accessTier = 'past';
        hasBeaconAccess = false;
        hasChatAccess = false;
        statusMessage = 'Past event night. Raas over, circle closed. View-only pass archived.';
      }

      // Generate a mock QR pass token if not already present
      const qrPassToken = `pass_${reg.id || reg.registrationId}_${phone.slice(-4)}`;

      enrichedEntries.push({
        registrationId: reg.id || reg.registrationId,
        name: reg.name,
        city: reg.city,
        venue: reg.venue,
        eventDate,
        skillLevel: reg.skillLevel,
        isAllWomen: Boolean(reg.allWomenToggle),
        isCaptain: Boolean(circleDetails?.captainId && circleDetails.captainId === (reg.id || reg.registrationId)),
        circleId: reg.circleId || null,
        circleName: circleDetails?.name || null,
        meetingPoint: hasBeaconAccess ? (circleDetails?.meetingPoint || null) : null,
        chatLink: hasChatAccess ? (circleDetails?.chatLink || null) : null,
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
