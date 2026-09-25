/**
 * @file netlify/shared/matching.js
 * @description Core Circle Matching Engine and Group Partitioning Logic for SoloSaathi Circle.
 *
 * Implements business algorithms governing:
 * - Deterministic Circle IDs, unique per venue and night (`{PREFIX}-{2-digit index}_{partition}`).
 * - Partition key resolution for Netlify Blobs storage (`groupstate:` vs `pending:`).
 * - Capacity threshold checking (`SOFT_MAX_GROUP = 24`).
 * - Strict gender balancing caps (`GENDER_CAP = 10` per declared gender in mixed circles).
 * - Small-circle merge planning across neighbouring skill tiers.
 * - Operational festival time-window evaluations (IST daily window and 2h advance cutoff).
 */

const {
  GENDER_CAP,
  SOFT_MAX_GROUP,
  LIVE_SEASON_START_DATE,
  LIVE_DAILY_WINDOW,
  EVENT_START_TIME_IST,
  SMALL_CIRCLE_MAX_MEMBERS,
  MERGE_RECEIVER_MAX_MEMBERS,
  SKILL_TIERS,
  CIRCLE_PREFIX,
} = require('./constants');
const { compositeKey } = require('./keys');

/**
 * Returns the circle name prefix for a level / gender preference.
 * 'allWomen' -> SAKHI, 'beginner' -> GARBA, 'intermediate' -> TAAL, 'advanced' -> RAAS.
 *
 * @param {string} level - Skill level.
 * @param {string} genderPref - 'mixed' or 'allWomen'.
 * @returns {string} Prefix.
 */
function getCirclePrefix(level, genderPref) {
  if (genderPref === 'allWomen') return CIRCLE_PREFIX.allWomen;
  return (level && CIRCLE_PREFIX[level]) || CIRCLE_PREFIX.beginner;
}

/**
 * Generates a Circle ID that is unique per venue and festival night.
 *
 * Format: `{PREFIX}-{2-digit index}_{city}_{venue}_{date}`, e.g.
 * 'TAAL-01_ahmedabad_united_way_garba_grounds_2026_10_17'. The partition suffix matters:
 * the index restarts at 01 for every venue and night, so without it circles overwrite each other.
 *
 * @param {string} level - Skill level ('beginner', 'intermediate', 'advanced').
 * @param {string} genderPref - Circle gender preference ('mixed' or 'allWomen').
 * @param {number|string} index - Numeric sequence index for the circle.
 * @param {{city: string, venue: string, eventDate: string}} partition - Where and when the circle meets.
 * @returns {string} Circle ID.
 */
function buildCircleId(level, genderPref, index, { city, venue, eventDate }) {
  const paddedIndex = String(parseInt(index, 10) || 1).padStart(2, '0');
  return `${getCirclePrefix(level, genderPref)}-${paddedIndex}_${compositeKey(city, venue, eventDate)}`;
}

/**
 * Display name for a circle, e.g. 'TAAL 01'.
 *
 * @param {string} level - Skill level.
 * @param {string} genderPref - 'mixed' or 'allWomen'.
 * @param {number|string} index - Numeric sequence index for the circle.
 * @returns {string} Display name.
 */
function buildCircleName(level, genderPref, index) {
  return `${getCirclePrefix(level, genderPref)} ${String(parseInt(index, 10) || 1).padStart(2, '0')}`;
}

/**
 * Constructs the canonical Netlify Blobs storage partition key for a matching bucket.
 *
 * Key Schema:
 * - Live:    `groupstate:{city}:{venue}:{level}:{genderPref}:{date}`
 * - Advance: `pending:{city}:{venue}:{level}:{genderPref}:{date}`
 *
 * The event date is always embedded in the key so that attendees on different festival nights never merge.
 *
 * @param {'live'|'advance'} type - Registration mode ('live' for walk-up, 'advance' for pre-booked).
 * @param {string} city - Festival city (e.g., 'Ahmedabad').
 * @param {string} venue - Festival ground/venue name (e.g., 'United Way Garba Grounds').
 * @param {string} level - Skill level ('beginner', 'intermediate', 'advanced').
 * @param {string} genderPref - Circle gender preference ('mixed' or 'allWomen').
 * @param {string} date - Event date in 'YYYY-MM-DD' format.
 * @returns {string} Partition key string.
 */
function getBucketKey(type, city, venue, level, genderPref, date) {
  const sanitizedCity = String(city || '').trim();
  const sanitizedVenue = String(venue || '').trim();
  const sanitizedLevel = String(level || 'beginner').trim();
  const sanitizedPref = String(genderPref || 'mixed').trim();
  const sanitizedDate = String(date || '').trim();

  if (type === 'advance') {
    return `pending:${sanitizedCity}:${sanitizedVenue}:${sanitizedLevel}:${sanitizedPref}:${sanitizedDate}`;
  }

  return `groupstate:${sanitizedCity}:${sanitizedVenue}:${sanitizedLevel}:${sanitizedPref}:${sanitizedDate}`;
}

/**
 * Determines whether a matching bucket has reached its soft capacity limit
 * and should trigger the creation of a new circle.
 *
 * @param {Object|Array|number} currentBucketState - Current group state object, members array, or count.
 * @returns {boolean} True if bucket size is greater than or equal to SOFT_MAX_GROUP (24).
 */
function shouldStartNewBucket(currentBucketState) {
  if (typeof currentBucketState === 'number') {
    return currentBucketState >= SOFT_MAX_GROUP;
  }

  if (Array.isArray(currentBucketState)) {
    return currentBucketState.length >= SOFT_MAX_GROUP;
  }

  if (currentBucketState && typeof currentBucketState === 'object') {
    if (typeof currentBucketState.totalCount === 'number') {
      return currentBucketState.totalCount >= SOFT_MAX_GROUP;
    }
    if (Array.isArray(currentBucketState.members)) {
      return currentBucketState.members.length >= SOFT_MAX_GROUP;
    }
  }

  return false;
}

/**
 * Checks whether adding an attendee of a given gender would violate the gender cap in a circle.
 *
 * Business Rules:
 * - Mixed circles enforce a maximum of 10 attendees (GENDER_CAP) of any single declared gender.
 * - Attendees specifying 'prefer_not_to_say' NEVER count against the gender cap.
 * - All-women circles bypass the gender cap entirely.
 *
 * @param {{male?: number, female?: number}} currentCounts - Current headcount per gender in the bucket.
 * @param {'male'|'female'|'prefer_not_to_say'} newGender - Gender of the incoming attendee.
 * @param {boolean} isAllWomen - Whether this is an all-women circle.
 * @returns {boolean} True if adding this attendee violates the cap (i.e., prohibited), false if permitted.
 */
function checkGenderCap(currentCounts = {}, newGender, isAllWomen = false) {
  // All-women circles have no male count and bypass the mixed-circle gender cap
  if (isAllWomen) {
    return false;
  }

  // Undeclared gender never violates the cap
  if (newGender === 'prefer_not_to_say') {
    return false;
  }

  const maleCount = currentCounts.male || 0;
  const femaleCount = currentCounts.female || 0;

  if (newGender === 'male' && maleCount + 1 > GENDER_CAP) {
    return true;
  }

  if (newGender === 'female' && femaleCount + 1 > GENDER_CAP) {
    return true;
  }

  return false;
}

/**
 * Plans how small circles merge before an event (the "12 hours before" step).
 *
 * Rules:
 * - A circle is small when it has 1 to SMALL_CIRCLE_MAX_MEMBERS (3) members.
 * - A small circle moves into a receiver with at most MERGE_RECEIVER_MAX_MEMBERS (10) members:
 *   same skill tier first, otherwise a neighbouring tier (beginner <-> intermediate <-> advanced).
 *   Beginner and advanced are never merged directly.
 * - Among eligible neighbours the fuller one wins (closer to a full circle); ties go to the lower tier.
 * - Receivers must stay within SOFT_MAX_GROUP and, for mixed circles, the gender cap.
 * - Smallest circles move first and sizes are updated after every move, so a receiver that has
 *   grown past 10 stops receiving. A small circle can itself be a receiver.
 * - Call it once per venue, night and category (mixed or all-women) so all-women circles only
 *   merge with each other.
 *
 * @param {Array<{circleId: string, skillLevel: string, size: number, maleCount?: number, femaleCount?: number, isAllWomen?: boolean}>} circles
 * @returns {{moves: Array<{from: string, to: string}>, flagged: string[]}} Moves in the order to apply
 *   them, and small circles that had no eligible receiver.
 */
function planSmallCircleMerges(circles = []) {
  const tierOf = (circle) => SKILL_TIERS.indexOf(circle.skillLevel);
  const state = circles.map((c) => ({
    ...c,
    maleCount: c.maleCount || 0,
    femaleCount: c.femaleCount || 0,
    mergedInto: null,
  }));
  const moves = [];
  const flagged = [];

  const sources = state
    .filter((c) => c.size >= 1 && c.size <= SMALL_CIRCLE_MAX_MEMBERS)
    .sort((a, b) => a.size - b.size || tierOf(a) - tierOf(b));

  for (const source of sources) {
    // It may have received other circles and is no longer small
    if (source.size < 1 || source.size > SMALL_CIRCLE_MAX_MEMBERS) continue;

    const candidates = state.filter((target) => {
      if (target === source || target.mergedInto || target.size < 1) return false;
      if (Math.abs(tierOf(target) - tierOf(source)) > 1) return false;
      if (target.size > MERGE_RECEIVER_MAX_MEMBERS) return false;
      if (target.size + source.size > SOFT_MAX_GROUP) return false;
      if (!source.isAllWomen && !target.isAllWomen) {
        if (target.maleCount + source.maleCount > GENDER_CAP) return false;
        if (target.femaleCount + source.femaleCount > GENDER_CAP) return false;
      }
      return true;
    });

    if (candidates.length === 0) {
      flagged.push(source.circleId);
      continue;
    }

    candidates.sort((a, b) => {
      const sameTierA = tierOf(a) === tierOf(source) ? 0 : 1;
      const sameTierB = tierOf(b) === tierOf(source) ? 0 : 1;
      return sameTierA - sameTierB || b.size - a.size || tierOf(a) - tierOf(b);
    });
    const target = candidates[0];

    moves.push({ from: source.circleId, to: target.circleId });
    target.size += source.size;
    target.maleCount += source.maleCount;
    target.femaleCount += source.femaleCount;
    source.size = 0;
    source.maleCount = 0;
    source.femaleCount = 0;
    source.mergedInto = target.circleId;
  }

  return { moves, flagged };
}

/**
 * Returns current Indian Standard Time (IST, UTC+5:30) as a Date object.
 *
 * @param {Date} [now=new Date()] - Reference date (defaults to system time).
 * @returns {{istDate: Date, year: number, month: number, day: number, hour: number, minute: number, dateString: string}}
 */
function getIstTime(now = new Date()) {
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istOffsetMs = 5.5 * 3600000; // +05:30 in milliseconds
  const istDate = new Date(utc + istOffsetMs);

  const year = istDate.getFullYear();
  const month = istDate.getMonth() + 1;
  const day = istDate.getDate();
  const hour = istDate.getHours();
  const minute = istDate.getMinutes();

  const pad = (n) => String(n).padStart(2, '0');
  const dateString = `${year}-${pad(month)}-${pad(day)}`;

  return {
    istDate,
    year,
    month,
    day,
    hour,
    minute,
    dateString,
  };
}

/**
 * Checks whether live registration is currently open.
 *
 * Rules:
 * - Allowed only on or after LIVE_SEASON_START_DATE ('2026-10-13').
 * - Allowed only within daily operating window: 6:30 PM (18:30) to 1:30 AM (01:30) IST next day.
 * - Because the window wraps past midnight, 00:00 to 01:30 belongs to the previous evening's festival night.
 *
 * @param {Date} [now=new Date()] - Reference timestamp.
 * @returns {{isOpen: boolean, reason?: string, festivalDate: string}}
 */
function isLiveRegistrationOpen(now = new Date()) {
  const ist = getIstTime(now);
  const { hour, minute, dateString } = ist;

  // Window check in IST minutes from midnight
  const currentMinutes = hour * 60 + minute;
  const startMinutes = LIVE_DAILY_WINDOW.startHour * 60 + LIVE_DAILY_WINDOW.startMinute; // 18:30 = 1110
  const endMinutes = LIVE_DAILY_WINDOW.endHour * 60 + LIVE_DAILY_WINDOW.endMinute;       // 01:30 = 90

  // Check if we are in the wrap-around window
  let inTimeWindow = false;
  let festivalDate = dateString;

  if (currentMinutes >= startMinutes) {
    // Evening window: 18:30 to 23:59
    inTimeWindow = true;
    festivalDate = dateString;
  } else if (currentMinutes <= endMinutes) {
    // Post-midnight window: 00:00 to 01:30
    inTimeWindow = true;
    // The festival date for post-midnight hours is the previous calendar day
    const prevDay = new Date(ist.istDate.getTime() - 24 * 3600000);
    const pad = (n) => String(n).padStart(2, '0');
    festivalDate = `${prevDay.getFullYear()}-${pad(prevDay.getMonth() + 1)}-${pad(prevDay.getDate())}`;
  }

  if (!inTimeWindow) {
    return {
      isOpen: false,
      reason: 'Live registration operates daily from 6:30 PM to 1:30 AM IST only.',
      festivalDate,
    };
  }

  // Season start date check against festival date
  if (festivalDate < LIVE_SEASON_START_DATE) {
    return {
      isOpen: false,
      reason: `Live festival registration opens on ${LIVE_SEASON_START_DATE}.`,
      festivalDate,
    };
  }

  return {
    isOpen: true,
    festivalDate,
  };
}

/**
 * Formats an IST {hour, minute} as '7:30 PM'.
 *
 * @param {{hour: number, minute: number}} time - Time of day.
 * @returns {string} Human-readable time.
 */
function formatIstTime({ hour, minute }) {
  const h12 = hour % 12 || 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

/**
 * Epoch milliseconds of a festival night's start (EVENT_START_TIME_IST on eventDate).
 *
 * @param {string} eventDateStr - Event date in 'YYYY-MM-DD' format.
 * @returns {number} Start time in epoch ms (UTC).
 */
function getEventStartUtcMs(eventDateStr) {
  const [year, month, day] = String(eventDateStr).trim().split('-').map(Number);
  const istOffsetMs = 5.5 * 3600000;
  return (
    Date.UTC(year, month - 1, day, EVENT_START_TIME_IST.hour, EVENT_START_TIME_IST.minute, 0) -
    istOffsetMs
  );
}

/**
 * Hours from `nowMs` until the event starts (negative once it has started).
 *
 * @param {string} eventDateStr - Event date in 'YYYY-MM-DD' format.
 * @param {number} [nowMs=Date.now()] - Reference time.
 * @returns {number} Hours remaining.
 */
function getHoursUntilEvent(eventDateStr, nowMs = Date.now()) {
  return (getEventStartUtcMs(eventDateStr) - nowMs) / 3600000;
}

/**
 * Checks whether advance registration is open for a specific event date.
 *
 * Rule: Advance registration stays open until 2 hours before the event's start
 * (EVENT_START_TIME_IST, 7:30 PM IST by default, so the cutoff is 5:30 PM IST).
 *
 * @param {string} eventDateStr - Event date in 'YYYY-MM-DD' format.
 * @param {Date} [now=new Date()] - Reference timestamp.
 * @returns {{isOpen: boolean, reason?: string, cutoffIso: string}}
 */
function isAdvanceRegistrationOpen(eventDateStr, now = new Date()) {
  if (!eventDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(eventDateStr).trim())) {
    return {
      isOpen: false,
      reason: 'Invalid event date format. Expected YYYY-MM-DD.',
      cutoffIso: '',
    };
  }

  const cutoffUtcMs = getEventStartUtcMs(eventDateStr) - 2 * 3600000;
  const cutoffDate = new Date(cutoffUtcMs);

  if (now.getTime() >= cutoffUtcMs) {
    return {
      isOpen: false,
      reason: `Advance registration for this event night closed 2 hours before the ${formatIstTime(
        EVENT_START_TIME_IST
      )} IST start.`,
      cutoffIso: cutoffDate.toISOString(),
    };
  }

  return {
    isOpen: true,
    cutoffIso: cutoffDate.toISOString(),
  };
}

module.exports = {
  getCirclePrefix,
  buildCircleId,
  buildCircleName,
  getBucketKey,
  shouldStartNewBucket,
  checkGenderCap,
  planSmallCircleMerges,
  getIstTime,
  isLiveRegistrationOpen,
  getEventStartUtcMs,
  getHoursUntilEvent,
  isAdvanceRegistrationOpen,
};
