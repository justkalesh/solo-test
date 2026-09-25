/**
 * @file netlify/functions/circle/get-circle.js
 * @description Loads one circle for the circle page (so it survives a page reload).
 *
 * - GET `?circleId=...` or POST `{ circleId }`, with the attendee session from verify-otp
 *   (`Authorization: Bearer <token>`).
 * - Only members can load a circle: one of the caller's registrations must point at it.
 * - A circle that was merged into another one (small advance circles, 12h before the event)
 *   resolves to the circle the attendee is in now.
 * - Returns `{ circle, registrationId }`, where `circle` has the same shape as the
 *   `joinMatchingBucket` and switch results (see circleSummary in shared/circles.js).
 */

const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { circleSummary } = require('../../shared/circles');
const { requireAttendee } = require('../../shared/session');
const db = require('../../shared/db');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return errorResponse('Method Not Allowed. Use GET or POST.', 405);
  }

  let circleId = null;
  if (event.httpMethod === 'GET') {
    circleId = event.queryStringParameters?.circleId;
  } else {
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      circleId = body.circleId;
    } catch (err) {
      return errorResponse('Invalid JSON body in request payload.', 400);
    }
  }

  const caller = requireAttendee(event);
  if (caller.response) return caller.response;

  if (!circleId) {
    return errorResponse("Missing required parameter 'circleId'.", 400);
  }

  try {
    const circle = await db.getCurrentCircleState(circleId);
    if (!circle) {
      return errorResponse('Circle not found.', 404);
    }

    const registrations = (await db.getRegistrationsByMobile(caller.phone)) || [];
    const mine = registrations.find((reg) => reg.circleId === circle.circleId);
    if (!mine) {
      return errorResponse('You are not a member of this circle.', 403);
    }

    const registrationId = mine.id || mine.registrationId;
    return successResponse({
      circle: circleSummary(circle, registrationId),
      registrationId,
      redirectedFrom: circle.circleId !== circleId ? circleId : null,
    });
  } catch (error) {
    console.error('[get-circle fatal error]', error);
    return errorResponse(error.message || 'Internal server error while loading the circle.', 500);
  }
};
