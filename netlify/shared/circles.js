/**
 * @file netlify/shared/circles.js
 * @description Shared helpers for building and describing Circle documents.
 *
 * Used by live matching (payment-helpers.js), advance circle formation and merging
 * (advance-circles.js), circle actions and get-circle, so every path creates circles and
 * returns them to the frontend in the same shape.
 */

const { SOFT_MAX_GROUP } = require('./constants');
const { buildCircleId, buildCircleName } = require('./matching');

const DEFAULT_MEETING_POINT = 'Near Main Festival Entrance / Information Desk';

/**
 * Creates a new, empty circle document.
 *
 * @param {Object} params
 * @param {string} params.level - Skill level.
 * @param {string} params.genderPref - 'mixed' or 'allWomen'.
 * @param {number} params.index - Circle number within this venue / night / level / category.
 * @param {string} params.city
 * @param {string} params.venue
 * @param {string} params.eventDate - 'YYYY-MM-DD'.
 * @param {number} params.now - Epoch ms.
 * @param {string} [params.chatLinkPrefix='demo'] - Placeholder WhatsApp invite prefix.
 * @param {'live'|'advance'} [params.origin='live'] - How the circle was formed; only advance circles are merged.
 * @returns {Object} Circle state.
 */
function createCircleState({
  level,
  genderPref,
  index,
  city,
  venue,
  eventDate,
  now,
  chatLinkPrefix = 'demo',
  origin = 'live',
}) {
  const circleId = buildCircleId(level, genderPref, index, { city, venue, eventDate });
  return {
    circleId,
    name: buildCircleName(level, genderPref, index),
    skillLevel: level,
    isAllWomen: genderPref === 'allWomen',
    city,
    venue,
    eventDate,
    captainId: null,
    captainName: null,
    meetingPoint: DEFAULT_MEETING_POINT,
    chatLink: `https://chat.whatsapp.com/${chatLinkPrefix}_${circleId.toLowerCase()}`,
    members: [],
    maleCount: 0,
    femaleCount: 0,
    otherCount: 0,
    totalCount: 0,
    status: 'active',
    isLocked: false,
    origin,
    createdAt: now,
  };
}

/**
 * Builds a circle member entry from a registration or pool item. Phone numbers are never
 * copied into circles, because every member of a circle receives the member list.
 *
 * @param {Object} source - Registration (`id`) or pool item (`registrationId`).
 * @param {number} now - Epoch ms.
 * @returns {Object} Member entry.
 */
function toCircleMember(source, now) {
  return {
    registrationId: source.registrationId || source.id,
    name: source.name,
    gender: source.gender,
    ageBand: source.ageBand,
    skillLevel: source.skillLevel,
    captainOptIn: Boolean(source.captainOptIn),
    isCaptain: false,
    joinedAt: now,
  };
}

/**
 * Adjusts the per-gender counters of a circle.
 *
 * @param {Object} circle - Circle state (mutated).
 * @param {string} gender - 'male' | 'female' | other.
 * @param {number} delta - +1 or -1.
 */
function adjustGenderCount(circle, gender, delta) {
  const field = gender === 'male' ? 'maleCount' : gender === 'female' ? 'femaleCount' : 'otherCount';
  circle[field] = Math.max(0, (circle[field] || 0) + delta);
}

/**
 * Makes sure a circle with members has a captain: the first opted-in volunteer, else the first member.
 *
 * @param {Object} circle - Circle state (mutated).
 */
function ensureCaptain(circle) {
  if (circle.captainId && circle.members.some((m) => m.registrationId === circle.captainId)) return;
  const captain = circle.members.find((m) => m.captainOptIn) || circle.members[0];
  circle.captainId = captain ? captain.registrationId : null;
  circle.captainName = captain ? captain.name : null;
  circle.members.forEach((m) => {
    m.isCaptain = Boolean(captain) && m.registrationId === captain.registrationId;
  });
}

/**
 * The circle shape the frontend expects (circle page, beacon, switch results).
 *
 * @param {Object} circle - Circle state.
 * @param {string} registrationId - The viewer's registration, for `isCaptain`.
 * @returns {Object} Circle summary.
 */
function circleSummary(circle, registrationId) {
  return {
    id: circle.circleId,
    circleId: circle.circleId,
    name: circle.name,
    meetingPoint: circle.meetingPoint,
    chatLink: circle.chatLink,
    isCaptain: Boolean(registrationId) && circle.captainId === registrationId,
    totalMembers: circle.totalCount || (circle.members ? circle.members.length : 0),
    skillLevel: circle.skillLevel,
    isAllWomen: Boolean(circle.isAllWomen),
    city: circle.city,
    venue: circle.venue,
    eventDate: circle.eventDate,
    captainId: circle.captainId || null,
    captainName: circle.captainName || null,
    maxSpots: circle.maxSpots || SOFT_MAX_GROUP,
    isLocked: Boolean(circle.isLocked),
    members: circle.members || [],
  };
}

module.exports = {
  DEFAULT_MEETING_POINT,
  createCircleState,
  toCircleMember,
  adjustGenderCount,
  ensureCaptain,
  circleSummary,
};
