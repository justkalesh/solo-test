/**
 * @file netlify/shared/advance-circles.js
 * @description Turning advance-booking pools into circles, in two stages.
 *
 * Stage 1, formCirclesFromPool (ADVANCE_FINALIZE_HOURS_BEFORE_EVENT before the start, or earlier
 *   once a pool reaches ADVANCE_EARLY_FINALIZE_POOL_SIZE): every pooled attendee is placed in a
 *   circle, whatever the pool size, so people can see their circle early. The partition's open
 *   circle is topped up first; new circles are created for the rest (<= 24, gender cap).
 *
 * Stage 2, mergeSmallCircles (MERGE_HOURS_BEFORE_EVENT before the start): circles with 1–3
 *   members move into a circle of the same or a neighbouring skill tier with <= 10 members
 *   (see planSmallCircleMerges). Circles with nowhere to go are flagged for the organizer.
 *
 * Used by scheduled/auto-finalize.js and the admin endpoint circle/finalize-bucket.js.
 */

const { SKILL_TIERS, SOFT_MAX_GROUP } = require('./constants');
const {
  shouldStartNewBucket,
  checkGenderCap,
  planSmallCircleMerges,
} = require('./matching');
const {
  createCircleState,
  toCircleMember,
  adjustGenderCount,
  ensureCaptain,
} = require('./circles');
const db = require('./db');

const GENDER_PREFS = ['mixed', 'allWomen'];

/**
 * Stage 1: places everyone waiting in one pool into circles.
 *
 * @param {{city: string, venue: string, level: string, genderPref: string, eventDate: string}} partition
 * @param {number} [now=Date.now()]
 * @returns {Promise<{circleIds: string[], placed: number}>} Circles created or topped up.
 */
async function formCirclesFromPool({ city, venue, level, genderPref, eventDate }, now = Date.now()) {
  const pool = (await db.getPendingPool(city, venue, level, genderPref, eventDate)) || [];
  if (pool.length === 0) return { circleIds: [], placed: 0 };

  const isAllWomen = genderPref === 'allWomen';
  const groupState = (await db.getGroupState(city, venue, level, genderPref, eventDate)) || {};
  let counter = groupState.lastCircleCounter || 0;
  const knownCircleIds = new Set(
    groupState.circleIds || (groupState.activeCircleId ? [groupState.activeCircleId] : [])
  );

  let active = groupState.activeCircleId ? await db.getCircleState(groupState.activeCircleId) : null;
  if (
    active &&
    (active.status !== 'active' ||
      active.isLocked ||
      active.origin !== 'advance' ||
      shouldStartNewBucket(active))
  ) {
    active = null;
  }

  const touched = new Map();
  const placedMembers = new Map(); // registrationId -> circleId
  let remaining = [...pool];

  while (remaining.length > 0) {
    if (!active) {
      counter += 1;
      active = createCircleState({
        level,
        genderPref,
        index: counter,
        city,
        venue,
        eventDate,
        now,
        chatLinkPrefix: 'adv',
        origin: 'advance',
      });
      knownCircleIds.add(active.circleId);
    }

    const leftover = [];
    for (const attendee of remaining) {
      const full = (active.totalCount || 0) >= SOFT_MAX_GROUP;
      const capped = checkGenderCap(
        { male: active.maleCount, female: active.femaleCount },
        attendee.gender,
        isAllWomen
      );
      if (full || capped) {
        leftover.push(attendee);
        continue;
      }
      active.members = [...(active.members || []), toCircleMember(attendee, now)];
      active.totalCount = active.members.length;
      adjustGenderCount(active, attendee.gender, 1);
      placedMembers.set(attendee.registrationId, active.circleId);
    }
    ensureCaptain(active);
    touched.set(active.circleId, active);

    remaining = leftover;
    if (remaining.length > 0) active = null; // the rest start a fresh circle
  }

  const batch = db.runBatch();
  for (const circle of touched.values()) {
    batch.set(db.getDocRef('circles', circle.circleId), circle, { merge: true });
  }
  for (const [registrationId, circleId] of placedMembers) {
    batch.set(db.getDocRef('registrations', registrationId), { circleId, updatedAt: now }, { merge: true });
  }
  batch.set(
    db.getDocRef('pools', db.getPoolDocId(city, venue, level, genderPref, eventDate)),
    { poolArray: [] },
    { merge: true }
  );
  const lastCircle = [...touched.values()].pop();
  batch.set(
    db.getDocRef('groupstate', db.getGroupStateDocId(city, venue, level, genderPref, eventDate)),
    {
      activeCircleId: lastCircle.circleId,
      lastCircleCounter: counter,
      circleIds: [...knownCircleIds],
      updatedAt: now,
    },
    { merge: true }
  );
  await batch.commit();

  return { circleIds: [...touched.keys()], placed: placedMembers.size };
}

/**
 * Loads the active advance circles of one venue, night and category across all skill tiers.
 * Live circles (formed from 6:30 PM walk-ins) are never merged.
 */
async function loadNightCircles(city, venue, genderPref, eventDate) {
  const circles = [];
  for (const level of SKILL_TIERS) {
    const groupState = await db.getGroupState(city, venue, level, genderPref, eventDate);
    const ids = groupState?.circleIds || (groupState?.activeCircleId ? [groupState.activeCircleId] : []);
    for (const circleId of ids) {
      const circle = await db.getCircleState(circleId);
      if (circle && circle.status === 'active' && circle.origin === 'advance') circles.push(circle);
    }
  }
  return circles;
}

/**
 * Stage 2: merges small circles for one venue and night (both categories).
 * Safe to run repeatedly: merged circles are skipped, and flags are re-evaluated each run.
 *
 * @param {{city: string, venue: string, eventDate: string}} night
 * @param {number} [now=Date.now()]
 * @returns {Promise<{moves: Array<{from: string, to: string}>, flagged: string[]}>}
 */
async function mergeSmallCircles({ city, venue, eventDate }, now = Date.now()) {
  const allMoves = [];
  const allFlagged = [];

  for (const genderPref of GENDER_PREFS) {
    const circles = await loadNightCircles(city, venue, genderPref, eventDate);
    if (circles.length === 0) continue;

    const byId = new Map(circles.map((c) => [c.circleId, c]));
    const { moves, flagged } = planSmallCircleMerges(
      circles.map((c) => ({
        circleId: c.circleId,
        skillLevel: c.skillLevel,
        size: c.totalCount || (c.members || []).length,
        maleCount: c.maleCount,
        femaleCount: c.femaleCount,
        isAllWomen: Boolean(c.isAllWomen),
      }))
    );

    const movedTo = new Map(); // registrationId -> final circleId
    for (const { from, to } of moves) {
      const source = byId.get(from);
      const target = byId.get(to);
      for (const member of source.members || []) {
        target.members = [...(target.members || []), { ...member, isCaptain: false }];
        adjustGenderCount(target, member.gender, 1);
        movedTo.set(member.registrationId, to);
      }
      target.totalCount = target.members.length;
      target.needsOrganizerAttention = false;
      target.updatedAt = now;
      ensureCaptain(target);

      source.members = [];
      source.totalCount = 0;
      source.maleCount = 0;
      source.femaleCount = 0;
      source.otherCount = 0;
      source.captainId = null;
      source.captainName = null;
      source.status = 'merged';
      source.mergedInto = to;
      source.mergedAt = now;
      source.needsOrganizerAttention = false;
    }

    for (const circle of circles) {
      if (circle.status !== 'active') continue;
      circle.needsOrganizerAttention = flagged.includes(circle.circleId);
    }

    const batch = db.runBatch();
    for (const circle of circles) {
      batch.set(db.getDocRef('circles', circle.circleId), circle, { merge: true });
    }
    for (const [registrationId, circleId] of movedTo) {
      batch.set(db.getDocRef('registrations', registrationId), { circleId, updatedAt: now }, { merge: true });
    }
    for (const level of SKILL_TIERS) {
      batch.set(
        db.getDocRef('groupstate', db.getGroupStateDocId(city, venue, level, genderPref, eventDate)),
        { mergeCheckedAt: now },
        { merge: true }
      );
    }
    await batch.commit();

    allMoves.push(...moves);
    allFlagged.push(...flagged);
  }

  return { moves: allMoves, flagged: allFlagged };
}

module.exports = {
  GENDER_PREFS,
  formCirclesFromPool,
  mergeSmallCircles,
};
