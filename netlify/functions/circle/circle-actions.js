/**
 * @file netlify/functions/circle/circle-actions.js
 * @description Circle Management and Participant Actions Handler for SoloSaathi Circle.
 *
 * Every action needs the attendee session from verify-otp (`Authorization: Bearer <token>`), and
 * `registrationId` must be one of the caller's own registrations.
 *
 * Dispatches and processes circle participant actions:
 * - 'grow': Captain opens 1-20 spots (GROW_MIN_SPOTS to GROW_MAX_SPOTS) and unlocks the circle.
 * - 'lock': Captain locks the circle to prevent additional walk-ins.
 * - 'leave': Member departs circle, freeing their slot; auto-elects replacement captain if needed.
 * - 'transferCaptain': Captain transfers role to another roster member (with cancel support).
 * - 'showup': Physical attendee check-in at venue ground, updating that night's showups list.
 * - 'switchCircle': Moves attendee to another circle, chosen by `newSkillLevel` (same venue and
 *   night) or an explicit `targetCircleId`:
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
  SKILL_TIERS,
} = require('../../shared/constants');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const { checkGenderCap, shouldStartNewBucket } = require('../../shared/matching');
const {
  createCircleState,
  adjustGenderCount,
  ensureCaptain,
  circleSummary,
} = require('../../shared/circles');
const { requireAttendee } = require('../../shared/session');
const db = require('../../shared/db');

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

  const { action, registrationId } = body;
  if (!action || typeof action !== 'string') {
    return errorResponse("Missing required 'action' parameter.", 400);
  }

  // Caller must hold a verified session and act on their own registration
  const caller = requireAttendee(event);
  if (caller.response) return caller.response;
  if (!registrationId) {
    return errorResponse("registrationId is required for circle actions.", 400);
  }

  const now = Date.now();

  try {
    const registration = await db.getRegistration(registrationId);
    if (!registration || registration.whatsapp !== caller.phone) {
      return errorResponse('This registration does not belong to the verified number.', 403);
    }

    // -------------------------------------------------------------------------
    // ACTION: SHOWUP (Venue gate check-in)
    // -------------------------------------------------------------------------
    if (action === 'showup') {
      const { city, venue, eventDate } = registration;
      const showups = (await db.getShowups(city, venue, eventDate)) || [];
      if (showups.some((s) => s.registrationId === registrationId)) {
        return successResponse({
          message: 'Attendee already checked in.',
          alreadyCheckedIn: true,
          totalShowups: showups.length,
        });
      }

      await db.getDocRef('showups', db.getShowupDocId(city, venue, eventDate)).set(
        {
          showupsArray: db.FieldValue.arrayUnion({
            registrationId,
            circleId: registration.circleId || null,
            checkedInAt: now,
            gate: body.gate || 'Main Gate',
          }),
        },
        { merge: true }
      );

      return successResponse({
        message: 'Attendee check-in recorded successfully.',
        checkedInAt: now,
        totalShowups: showups.length + 1,
      });
    }

    // All other actions work on the caller's current circle
    const circleId = body.circleId || registration.circleId;
    if (!circleId) {
      return errorResponse('circleId is required for this action.', 400);
    }
    if (registration.circleId !== circleId) {
      return errorResponse('You are not a member of this circle.', 403);
    }

    const circle = await db.getCircleState(circleId);
    if (!circle) {
      return errorResponse(`Circle '${circleId}' not found.`, 404);
    }

    const requireCaptain = () =>
      circle.captainId === registrationId
        ? null
        : errorResponse('Only the Circle Captain can do this.', 403);

    // -------------------------------------------------------------------------
    // ACTION: GROW (Open 1-20 additional spots, unlock circle)
    // -------------------------------------------------------------------------
    if (action === 'grow') {
      const notCaptain = requireCaptain();
      if (notCaptain) return notCaptain;

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
    // ACTION: LOCK
    // -------------------------------------------------------------------------
    if (action === 'lock') {
      const notCaptain = requireCaptain();
      if (notCaptain) return notCaptain;

      circle.isLocked = true;
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
    // ACTION: LEAVE
    // -------------------------------------------------------------------------
    if (action === 'leave') {
      return await db.runTransaction(async (transaction) => {
        const circleRef = db.getDocRef('circles', circleId);
        const circleDoc = await transaction.get(circleRef);
        if (!circleDoc.exists) {
          return errorResponse(`Circle '${circleId}' not found.`, 404);
        }

        const circleData = circleDoc.data();
        const memberIndex = circleData.members.findIndex((m) => m.registrationId === registrationId);
        if (memberIndex === -1) {
          return errorResponse('Attendee is not currently a member of this circle.', 404);
        }

        const [leavingMember] = circleData.members.splice(memberIndex, 1);
        circleData.totalCount = circleData.members.length;
        adjustGenderCount(circleData, leavingMember.gender, -1);

        let newCaptainName = null;
        if (circleData.captainId === registrationId) {
          circleData.captainId = null;
          ensureCaptain(circleData);
          newCaptainName = circleData.captainName;
        }
        circleData.updatedAt = now;

        transaction.set(circleRef, circleData, { merge: true });
        transaction.set(
          db.getDocRef('registrations', registrationId),
          { circleId: null, updatedAt: now },
          { merge: true }
        );

        return successResponse({
          message: 'Left circle successfully.',
          circleId,
          remainingMembers: circleData.totalCount,
          newCaptain: newCaptainName,
        });
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: TRANSFER CAPTAIN
    // -------------------------------------------------------------------------
    if (action === 'transferCaptain') {
      const notCaptain = requireCaptain();
      if (notCaptain) return notCaptain;

      const { newCaptainId, cancelTransfer } = body;
      if (cancelTransfer) {
        circle.pendingCaptainTransfer = null;
        await db.saveCircleState(circleId, circle);
        return successResponse({ message: 'Captain transfer cancelled.', circleId });
      }

      const targetMember = circle.members.find((m) => m.registrationId === newCaptainId);
      if (!targetMember) {
        return errorResponse('Target member is not in this circle roster.', 404);
      }

      circle.members.forEach((m) => {
        m.isCaptain = m.registrationId === newCaptainId;
      });
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
    // ACTION: SWITCH CIRCLE (by skill level, or to a specific circle)
    // -------------------------------------------------------------------------
    if (action === 'switchCircle') {
      const { newSkillLevel, targetCircleId } = body;
      if (!newSkillLevel && !targetCircleId) {
        return errorResponse('Choose a skill level (newSkillLevel) or a targetCircleId to switch to.', 400);
      }
      if (newSkillLevel && !SKILL_TIERS.includes(newSkillLevel)) {
        return errorResponse(`newSkillLevel must be one of: ${SKILL_TIERS.join(', ')}.`, 400);
      }
      if (newSkillLevel && newSkillLevel === circle.skillLevel) {
        return errorResponse('You are already in a circle at this skill level.', 400);
      }
      if (targetCircleId && targetCircleId === circleId) {
        return errorResponse('Attendee is already in target circle.', 400);
      }

      const genderPref = circle.isAllWomen ? 'allWomen' : 'mixed';

      return await db.runTransaction(async (transaction) => {
        const sourceRef = db.getDocRef('circles', circleId);
        const regRef = db.getDocRef('registrations', registrationId);

        // Reads first (Firestore transactions require all reads before writes)
        const sourceDoc = await transaction.get(sourceRef);
        const regDoc = await transaction.get(regRef);
        if (!sourceDoc.exists) {
          return errorResponse(`Source circle '${circleId}' not found.`, 404);
        }
        const sourceCircle = sourceDoc.data();
        const reg = regDoc.exists ? regDoc.data() : registration;

        let targetRef;
        let targetCircle = null;
        let groupStateRef = null;
        let groupState = null;

        if (targetCircleId) {
          targetRef = db.getDocRef('circles', targetCircleId);
          const targetDoc = await transaction.get(targetRef);
          if (!targetDoc.exists) {
            return errorResponse(`Target circle '${targetCircleId}' not found.`, 404);
          }
          targetCircle = targetDoc.data();
          if (
            targetCircle.city !== sourceCircle.city ||
            targetCircle.venue !== sourceCircle.venue ||
            targetCircle.eventDate !== sourceCircle.eventDate
          ) {
            return errorResponse('You can only switch to a circle at the same venue and night.', 400);
          }
        } else {
          // Same venue and night, new level: the level's open circle, or a new one
          groupStateRef = db.getDocRef(
            'groupstate',
            db.getGroupStateDocId(circle.city, circle.venue, newSkillLevel, genderPref, circle.eventDate)
          );
          const groupStateDoc = await transaction.get(groupStateRef);
          groupState = groupStateDoc.exists ? groupStateDoc.data() : {};
          if (groupState.activeCircleId) {
            targetRef = db.getDocRef('circles', groupState.activeCircleId);
            const activeDoc = await transaction.get(targetRef);
            targetCircle = activeDoc.exists ? activeDoc.data() : null;
          }
        }

        const memberIndex = sourceCircle.members.findIndex((m) => m.registrationId === registrationId);
        if (memberIndex === -1) {
          return errorResponse('Attendee is not currently in source circle.', 404);
        }
        const member = sourceCircle.members[memberIndex];

        // Switching limits
        const switchHistory = reg.switchHistory || [];
        if (switchHistory.length >= SWITCH_CIRCLE_MAX_PER_NIGHT) {
          return errorResponse(
            `Maximum of ${SWITCH_CIRCLE_MAX_PER_NIGHT} circle switches reached for tonight.`,
            403,
            { switchesUsed: switchHistory.length, maxSwitches: SWITCH_CIRCLE_MAX_PER_NIGHT }
          );
        }
        const minutesSinceJoin = (now - (member.joinedAt || sourceCircle.createdAt || now)) / 60000;
        if (minutesSinceJoin < SWITCH_CIRCLE_LOCK_MINUTES) {
          const waitMinutes = Math.ceil(SWITCH_CIRCLE_LOCK_MINUTES - minutesSinceJoin);
          return errorResponse(
            `New circle members cannot switch for the first ${SWITCH_CIRCLE_LOCK_MINUTES} minutes. Please wait ${waitMinutes} minute(s).`,
            429,
            { minutesRemaining: waitMinutes }
          );
        }
        if (switchHistory.length > 0) {
          const minutesSinceLastSwitch = (now - switchHistory[switchHistory.length - 1].timestamp) / 60000;
          if (minutesSinceLastSwitch < SWITCH_CIRCLE_COOLDOWN_MINUTES) {
            const waitMinutes = Math.ceil(SWITCH_CIRCLE_COOLDOWN_MINUTES - minutesSinceLastSwitch);
            return errorResponse(
              `Cooldown active. You must wait ${SWITCH_CIRCLE_COOLDOWN_MINUTES} minutes between switches. ${waitMinutes} minute(s) remaining.`,
              429,
              { cooldownRemainingMinutes: waitMinutes }
            );
          }
        }

        const cannotJoin = (c) =>
          !c ||
          c.status !== 'active' ||
          c.isLocked ||
          c.totalCount >= (c.maxSpots || SOFT_MAX_GROUP) ||
          checkGenderCap({ male: c.maleCount, female: c.femaleCount }, member.gender, c.isAllWomen);

        let createdNewCircle = false;
        if (targetCircleId) {
          if (targetCircle.isLocked || targetCircle.status !== 'active') {
            return errorResponse('Target circle is currently locked to new members.', 403);
          }
          if (targetCircle.totalCount >= (targetCircle.maxSpots || SOFT_MAX_GROUP)) {
            return errorResponse('Target circle has reached capacity.', 403);
          }
          if (
            checkGenderCap(
              { male: targetCircle.maleCount, female: targetCircle.femaleCount },
              member.gender,
              targetCircle.isAllWomen
            )
          ) {
            return errorResponse('Target circle has reached the gender balance limit for this group.', 403);
          }
        } else if (cannotJoin(targetCircle) || shouldStartNewBucket(targetCircle)) {
          const index = (groupState.lastCircleCounter || 0) + 1;
          targetCircle = createCircleState({
            level: newSkillLevel,
            genderPref,
            index,
            city: circle.city,
            venue: circle.venue,
            eventDate: circle.eventDate,
            now,
            chatLinkPrefix: circle.origin === 'advance' ? 'adv' : 'demo',
            origin: circle.origin || 'live',
          });
          targetRef = db.getDocRef('circles', targetCircle.circleId);
          groupState = { ...groupState, lastCircleCounter: index };
          createdNewCircle = true;
        }
        const finalTargetId = targetCircle.circleId;

        // Move the member
        sourceCircle.members.splice(memberIndex, 1);
        sourceCircle.totalCount = sourceCircle.members.length;
        adjustGenderCount(sourceCircle, member.gender, -1);
        if (sourceCircle.captainId === registrationId) {
          sourceCircle.captainId = null;
          ensureCaptain(sourceCircle);
        }
        sourceCircle.updatedAt = now;

        const movedMember = {
          ...member,
          skillLevel: newSkillLevel || member.skillLevel,
          isCaptain: false,
          joinedAt: now,
        };
        targetCircle.members = [...(targetCircle.members || []), movedMember];
        targetCircle.totalCount = targetCircle.members.length;
        adjustGenderCount(targetCircle, member.gender, 1);
        ensureCaptain(targetCircle);
        targetCircle.updatedAt = now;

        switchHistory.push({ fromCircleId: circleId, toCircleId: finalTargetId, timestamp: now });

        transaction.set(sourceRef, sourceCircle, { merge: true });
        transaction.set(targetRef, targetCircle, { merge: true });
        transaction.set(
          regRef,
          {
            circleId: finalTargetId,
            ...(newSkillLevel ? { skillLevel: newSkillLevel } : {}),
            switchHistory,
            updatedAt: now,
          },
          { merge: true }
        );
        if (groupStateRef) {
          transaction.set(
            groupStateRef,
            {
              activeCircleId: finalTargetId,
              lastCircleCounter: groupState.lastCircleCounter || 0,
              ...(createdNewCircle ? { circleIds: db.FieldValue.arrayUnion(finalTargetId) } : {}),
              updatedAt: now,
            },
            { merge: true }
          );
        }

        return successResponse({
          message: `Switched to ${targetCircle.name}.`,
          newCircleId: finalTargetId,
          newCircle: circleSummary(targetCircle, registrationId),
          switchesRemaining: SWITCH_CIRCLE_MAX_PER_NIGHT - switchHistory.length,
        });
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
