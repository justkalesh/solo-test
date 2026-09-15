/**
 * @file netlify/functions/circle/circle-actions.js
 * @description Circle Management and Participant Actions Handler for SoloSaathi Circle.
 *
 * Dispatches and processes circle participant actions:
 * - 'grow': Any member opens 1-20 spots (GROW_MIN_SPOTS to GROW_MAX_SPOTS) and unlocks the circle.
 * - 'lock': Any member locks circle to prevent additional walk-ins.
 * - 'leave': Member departs circle, freeing their slot; auto-elects replacement captain if needed.
 * - 'transferCaptain': Captain transfers role to another roster member (with cancel support).
 * - 'showup': Physical attendee check-in at venue ground, updating venue showups list.
 * - 'switchCircle': Moves attendee to another circle:
 *   - Capped at 3 switches per night (SWITCH_CIRCLE_MAX_PER_NIGHT = 3).
 *   - Locked for first 5 minutes after joining (SWITCH_CIRCLE_LOCK_MINUTES = 5).
 *   - 20-minute cooldown between subsequent switches (SWITCH_CIRCLE_COOLDOWN_MINUTES = 20).
 */

const {
  GROW_MIN_SPOTS,
  GROW_MAX_SPOTS,
  SWITCH_CIRCLE_MAX_PER_NIGHT,
  SWITCH_CIRCLE_LOCK_MINUTES,
  SWITCH_CIRCLE_COOLDOWN_MINUTES,
  SOFT_MAX_GROUP,
} = require('../../shared/constants');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { checkGenderCap } = require('../../shared/matching');
const db = require('../../shared/db');

/**
 * Netlify Function Handler: Dispatches circle management actions.
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

  const { action, circleId, registrationId } = body;
  if (!action || typeof action !== 'string') {
    return errorResponse("Missing required 'action' parameter.", 400);
  }

  const now = Date.now();

  try {
    // -------------------------------------------------------------------------
    // ACTION: SHOWUP (Venue gate check-in)
    // -------------------------------------------------------------------------
    if (action === 'showup') {
      const { city, venue, gate } = body;
      if (!city || !venue || !registrationId) {
        return errorResponse("Missing required parameters for 'showup': city, venue, registrationId.", 400);
      }

      const showups = (await db.getShowups(city, venue)) || [];
      const alreadyCheckedIn = showups.some((s) => s.registrationId === registrationId);

      if (alreadyCheckedIn) {
        return successResponse({
          message: 'Attendee already checked in.',
          alreadyCheckedIn: true,
          totalShowups: showups.length,
        });
      }

      const newCheckin = {
        registrationId,
        circleId: circleId || null,
        checkedInAt: now,
        gate: gate || 'Main Gate',
      };

      showups.push(newCheckin);
      await db.saveShowups(city, venue, showups);

      return successResponse({
        message: 'Attendee check-in recorded successfully.',
        checkedInAt: now,
        totalShowups: showups.length,
      });
    }

    // All subsequent actions require circleId and an existing circleState
    if (!circleId) {
      return errorResponse("circleId is required for this action.", 400);
    }

    const circle = await db.getCircleState(circleId);
    if (!circle) {
      return errorResponse(`Circle '${circleId}' not found.`, 404);
    }

    // -------------------------------------------------------------------------
    // ACTION: GROW (Open 1-20 additional spots, unlock circle)
    // -------------------------------------------------------------------------
    if (action === 'grow') {
      const additionalSpots = parseInt(body.spots, 10) || 5;

      if (additionalSpots < GROW_MIN_SPOTS || additionalSpots > GROW_MAX_SPOTS) {
        return errorResponse(
          `Can only grow between ${GROW_MIN_SPOTS} and ${GROW_MAX_SPOTS} spots. Requested: ${additionalSpots}.`,
          400
        );
      }

      circle.maxSpots = (circle.maxSpots || SOFT_MAX_GROUP) + additionalSpots;
      circle.isLocked = false; // Growing unlocks the circle
      circle.status = 'active';
      circle.updatedAt = now;

      await db.saveCircleState(circleId, circle);

      return successResponse({
        message: `Circle unlocked and expanded by ${additionalSpots} spots.`,
        circleId,
        isLocked: false,
        maxSpots: circle.maxSpots,
        currentMembers: circle.totalCount,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: LOCK (Close circle to new attendees)
    // -------------------------------------------------------------------------
    if (action === 'lock') {
      circle.isLocked = true;
      circle.status = 'locked';
      circle.lockedAt = now;
      circle.updatedAt = now;

      await db.saveCircleState(circleId, circle);

      return successResponse({
        message: 'Circle is now locked to new members.',
        circleId,
        isLocked: true,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: LEAVE (Member leaves circle)
    // -------------------------------------------------------------------------
    if (action === 'leave') {
      if (!registrationId) {
        return errorResponse("registrationId is required to leave a circle.", 400);
      }

      const memberIndex = circle.members.findIndex((m) => m.registrationId === registrationId);
      if (memberIndex === -1) {
        return errorResponse("Attendee is not currently a member of this circle.", 404);
      }

      const leavingMember = circle.members[memberIndex];
      circle.members.splice(memberIndex, 1);
      circle.totalCount = circle.members.length;

      if (leavingMember.gender === 'male') circle.maleCount = Math.max(0, (circle.maleCount || 1) - 1);
      else if (leavingMember.gender === 'female') circle.femaleCount = Math.max(0, (circle.femaleCount || 1) - 1);
      else circle.otherCount = Math.max(0, (circle.otherCount || 1) - 1);

      // If the leaving member was the Captain, designate a replacement
      let newCaptainName = null;
      if (circle.captainId === registrationId) {
        const replacement = circle.members.find((m) => m.captainOptIn) || circle.members[0];
        if (replacement) {
          circle.captainId = replacement.registrationId;
          circle.captainName = replacement.name;
          replacement.isCaptain = true;
          newCaptainName = replacement.name;
        } else {
          circle.captainId = null;
          circle.captainName = null;
        }
      }

      circle.updatedAt = now;
      await db.saveCircleState(circleId, circle);

      // Clear circle association on registration
      const reg = await db.getRegistration(registrationId);
      if (reg) {
        await db.saveRegistration(registrationId, {
          ...reg,
          circleId: null,
          updatedAt: now,
        });
      }

      return successResponse({
        message: 'Left circle successfully.',
        circleId,
        remainingMembers: circle.totalCount,
        newCaptain: newCaptainName,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: TRANSFER CAPTAIN
    // -------------------------------------------------------------------------
    if (action === 'transferCaptain') {
      const { currentCaptainId, newCaptainId, cancelTransfer } = body;

      if (cancelTransfer) {
        circle.pendingCaptainTransfer = null;
        await db.saveCircleState(circleId, circle);
        return successResponse({ message: 'Captain transfer cancelled.', circleId });
      }

      if (circle.captainId && circle.captainId !== currentCaptainId) {
        return errorResponse('Only the current Circle Captain can transfer leadership.', 403);
      }

      const targetMember = circle.members.find((m) => m.registrationId === newCaptainId);
      if (!targetMember) {
        return errorResponse('Target member is not in this circle roster.', 404);
      }

      // Reassign Captain
      for (const m of circle.members) {
        m.isCaptain = m.registrationId === newCaptainId;
      }
      circle.captainId = targetMember.registrationId;
      circle.captainName = targetMember.name;
      circle.updatedAt = now;

      await db.saveCircleState(circleId, circle);

      return successResponse({
        message: `Captaincy successfully transferred to ${targetMember.name}.`,
        circleId,
        newCaptainId: targetMember.registrationId,
        newCaptainName: targetMember.name,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: SWITCH CIRCLE
    // -------------------------------------------------------------------------
    if (action === 'switchCircle') {
      const { targetCircleId } = body;
      if (!registrationId || !targetCircleId) {
        return errorResponse("Missing required parameters: registrationId, targetCircleId.", 400);
      }

      if (circleId === targetCircleId) {
        return errorResponse("Attendee is already in target circle.", 400);
      }

      // Member check in source circle
      const memberIndex = circle.members.findIndex((m) => m.registrationId === registrationId);
      if (memberIndex === -1) {
        return errorResponse("Attendee is not currently in source circle.", 404);
      }
      const member = circle.members[memberIndex];

      // Fetch registration record to check switch limits and cooldowns
      const reg = await db.getRegistration(registrationId);
      const switchHistory = reg?.switchHistory || [];

      // Rule 1: Max 3 switches per night
      if (switchHistory.length >= SWITCH_CIRCLE_MAX_PER_NIGHT) {
        return errorResponse(
          `Maximum of ${SWITCH_CIRCLE_MAX_PER_NIGHT} circle switches reached for tonight.`,
          403,
          { switchesUsed: switchHistory.length, maxSwitches: SWITCH_CIRCLE_MAX_PER_NIGHT }
        );
      }

      // Rule 2: Lock-in for first 5 minutes after joining
      const joinedAt = member.joinedAt || circle.createdAt || now;
      const minutesSinceJoin = (now - joinedAt) / 60000;
      if (minutesSinceJoin < SWITCH_CIRCLE_LOCK_MINUTES) {
        const waitMinutes = Math.ceil(SWITCH_CIRCLE_LOCK_MINUTES - minutesSinceJoin);
        return errorResponse(
          `New circle members cannot switch for the first ${SWITCH_CIRCLE_LOCK_MINUTES} minutes. Please wait ${waitMinutes} minute(s).`,
          429,
          { minutesRemaining: waitMinutes }
        );
      }

      // Rule 3: 20-minute cooldown between subsequent switches
      if (switchHistory.length > 0) {
        const lastSwitchAt = switchHistory[switchHistory.length - 1].timestamp;
        const minutesSinceLastSwitch = (now - lastSwitchAt) / 60000;
        if (minutesSinceLastSwitch < SWITCH_CIRCLE_COOLDOWN_MINUTES) {
          const waitMinutes = Math.ceil(SWITCH_CIRCLE_COOLDOWN_MINUTES - minutesSinceLastSwitch);
          return errorResponse(
            `Cooldown active. You must wait ${SWITCH_CIRCLE_COOLDOWN_MINUTES} minutes between switches. ${waitMinutes} minute(s) remaining.`,
            429,
            { cooldownRemainingMinutes: waitMinutes }
          );
        }
      }

      // Target circle evaluation
      const targetCircle = await db.getCircleState(targetCircleId);
      if (!targetCircle) {
        return errorResponse(`Target circle '${targetCircleId}' not found.`, 404);
      }

      if (targetCircle.isLocked || targetCircle.status === 'locked' || targetCircle.status === 'closed') {
        return errorResponse("Target circle is currently locked to new members.", 403);
      }

      if (targetCircle.totalCount >= (targetCircle.maxSpots || SOFT_MAX_GROUP)) {
        return errorResponse("Target circle has reached capacity.", 403);
      }

      // Gender cap evaluation on target circle
      const genderViolated = checkGenderCap(
        { male: targetCircle.maleCount, female: targetCircle.femaleCount },
        member.gender,
        targetCircle.isAllWomen
      );
      if (genderViolated) {
        return errorResponse("Target circle has reached the gender balance limit for this group.", 403);
      }

      // Execute transfer: remove from source
      circle.members.splice(memberIndex, 1);
      circle.totalCount = circle.members.length;
      if (member.gender === 'male') circle.maleCount = Math.max(0, (circle.maleCount || 1) - 1);
      else if (member.gender === 'female') circle.femaleCount = Math.max(0, (circle.femaleCount || 1) - 1);
      else circle.otherCount = Math.max(0, (circle.otherCount || 1) - 1);

      if (circle.captainId === registrationId) {
        const rep = circle.members.find((m) => m.captainOptIn) || circle.members[0];
        circle.captainId = rep ? rep.registrationId : null;
        circle.captainName = rep ? rep.name : null;
        if (rep) rep.isCaptain = true;
      }
      circle.updatedAt = now;
      await db.saveCircleState(circleId, circle);

      // Add to target
      const transferredMember = {
        ...member,
        isCaptain: false,
        joinedAt: now,
      };
      targetCircle.members.push(transferredMember);
      targetCircle.totalCount = targetCircle.members.length;
      if (member.gender === 'male') targetCircle.maleCount = (targetCircle.maleCount || 0) + 1;
      else if (member.gender === 'female') targetCircle.femaleCount = (targetCircle.femaleCount || 0) + 1;
      else targetCircle.otherCount = (targetCircle.otherCount || 0) + 1;
      targetCircle.updatedAt = now;
      await db.saveCircleState(targetCircleId, targetCircle);

      // Update attendee registration with switch history
      switchHistory.push({
        fromCircleId: circleId,
        toCircleId: targetCircleId,
        timestamp: now,
      });

      if (reg) {
        await db.saveRegistration(registrationId, {
          ...reg,
          circleId: targetCircleId,
          switchHistory,
          updatedAt: now,
        });
      }

      return successResponse({
        message: `Successfully switched from ${circleId} to ${targetCircleId}.`,
        newCircleId: targetCircleId,
        switchesRemaining: SWITCH_CIRCLE_MAX_PER_NIGHT - switchHistory.length,
      });
    }

    return errorResponse(`Unknown circle action '${action}'.`, 400);
  } catch (error) {
    console.error('[circle-actions fatal error]', error);
    return errorResponse(
      error.message || 'Internal server error during circle action execution.',
      500
    );
  }
};
