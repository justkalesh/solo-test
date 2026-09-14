/**
 * @file netlify/shared/matching.js
 * @description Core Circle Matching Engine and Group Partitioning Logic for SoloSaathi Circle.
 *
 * Implements business algorithms governing:
 * - Deterministic Circle ID naming (`{PREFIX}-{2-digit index}`).
 * - Partition key resolution for Netlify Blobs storage (`groupstate:` vs `pending:`).
 * - Capacity threshold checking (`SOFT_MAX_GROUP = 24`).
 * - Strict gender balancing caps (`GENDER_CAP = 10` per declared gender in mixed circles).
 * - Multi-tier skill level grouping with adjacent-level fallback rules.
 * - Operational festival time-window evaluations (IST daily window and 2h advance cutoff).
 */

const {
  GENDER_CAP,
  ALL_WOMEN_MIN_FLOOR,
  ALL_WOMEN_ABSOLUTE_MIN,
  SOFT_MAX_GROUP,
  LIVE_SEASON_START_DATE,
  LIVE_DAILY_WINDOW,
  CIRCLE_PREFIX,
} = require('./constants');

/**
 * Generates a standard Circle ID string based on skill level, gender preference, and bucket index.
 *
 * Format: `{PREFIX}-{2-digit index}`
 * Prefixes:
 * - 'allWomen' -> SAKHI
 * - 'beginner' -> GARBA
 * - 'intermediate' -> TAAL
 * - 'advanced' -> RAAS
 *
 * @param {string} level - Skill level ('beginner', 'intermediate', 'advanced').
 * @param {string} genderPref - Circle gender preference ('mixed' or 'allWomen').
 * @param {number|string} index - Numeric sequence index for the circle.
 * @returns {string} Formatted Circle ID (e.g., 'GARBA-01', 'TAAL-04', 'SAKHI-02').
 */
function buildCircleId(level, genderPref, index) {
  let prefix = CIRCLE_PREFIX.beginner;

  if (genderPref === 'allWomen') {
    prefix = CIRCLE_PREFIX.allWomen;
  } else if (level && CIRCLE_PREFIX[level]) {
    prefix = CIRCLE_PREFIX[level];
  }

  const numIndex = parseInt(index, 10) || 1;
  const paddedIndex = String(numIndex).padStart(2, '0');

  return `${prefix}-${paddedIndex}`;
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
 * Resolves skill level grouping decisions according to strict matching priority rules.
 *
 * Priority Order:
 * 1. Same-level matching first (beginner with beginner, intermediate with intermediate, advanced with advanced).
 * 2. If counts are insufficient, combine adjacent skill levels only:
 *    - [beginner + intermediate] OR [intermediate + advanced].
 * 3. NEVER combine beginner and advanced directly.
 *
 * @param {Object<string, number>} countsByLevel - Headcount per skill level: { beginner: X, intermediate: Y, advanced: Z }.
 * @param {number} [targetGroupSize=16] - Target headcount to finalize a circle.
 * @returns {Array<{levels: string[], count: number, strategy: 'exact'|'adjacent_merged'|'waitlist'}>} Grouping decisions.
 */
function resolveSkillLevelGrouping(countsByLevel = {}, targetGroupSize = 16) {
  const beginner = countsByLevel.beginner || 0;
  const intermediate = countsByLevel.intermediate || 0;
  const advanced = countsByLevel.advanced || 0;

  const groupings = [];

  // 1. Process exact same-level matches
  let remBeginner = beginner;
  let remIntermediate = intermediate;
  let remAdvanced = advanced;

  while (remBeginner >= targetGroupSize) {
    groupings.push({ levels: ['beginner'], count: targetGroupSize, strategy: 'exact' });
    remBeginner -= targetGroupSize;
  }

  while (remIntermediate >= targetGroupSize) {
    groupings.push({ levels: ['intermediate'], count: targetGroupSize, strategy: 'exact' });
    remIntermediate -= targetGroupSize;
  }

  while (remAdvanced >= targetGroupSize) {
    groupings.push({ levels: ['advanced'], count: targetGroupSize, strategy: 'exact' });
    remAdvanced -= targetGroupSize;
  }

  // 2. Process adjacent-level fallback combinations for remainders
  // Check beginner + intermediate first
  if (remBeginner > 0 && remIntermediate > 0 && remBeginner + remIntermediate >= targetGroupSize) {
    const combinedCount = Math.min(remBeginner + remIntermediate, SOFT_MAX_GROUP);
    groupings.push({
      levels: ['beginner', 'intermediate'],
      count: combinedCount,
      strategy: 'adjacent_merged',
    });
    const fromBeginner = Math.min(remBeginner, combinedCount);
    const fromIntermediate = combinedCount - fromBeginner;
    remBeginner -= fromBeginner;
    remIntermediate -= fromIntermediate;
  }

  // Check intermediate + advanced next
  if (remIntermediate > 0 && remAdvanced > 0 && remIntermediate + remAdvanced >= targetGroupSize) {
    const combinedCount = Math.min(remIntermediate + remAdvanced, SOFT_MAX_GROUP);
    groupings.push({
      levels: ['intermediate', 'advanced'],
      count: combinedCount,
      strategy: 'adjacent_merged',
    });
    const fromIntermediate = Math.min(remIntermediate, combinedCount);
    const fromAdvanced = combinedCount - fromIntermediate;
    remIntermediate -= fromIntermediate;
    remAdvanced -= fromAdvanced;
  }

  // 3. Mark remaining attendees as waiting in pool
  if (remBeginner > 0) {
    groupings.push({ levels: ['beginner'], count: remBeginner, strategy: 'waitlist' });
  }
  if (remIntermediate > 0) {
    groupings.push({ levels: ['intermediate'], count: remIntermediate, strategy: 'waitlist' });
  }
  if (remAdvanced > 0) {
    groupings.push({ levels: ['advanced'], count: remAdvanced, strategy: 'waitlist' });
  }

  return groupings;
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
 * Checks whether advance registration is open for a specific event date.
 *
 * Rule: Advance registration stays open anytime up until 2 hours before the specific event's 7:30 PM IST start
 * (i.e. cutoff is 5:30 PM IST on the event date).
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

  // 7:30 PM IST = 19:30 IST. Cutoff 2 hours before = 17:30 IST (UTC 12:00)
  const [year, month, day] = eventDateStr.trim().split('-').map(Number);
  // Construct cutoff in UTC: 17:30 IST - 5:30 = 12:00 UTC
  const cutoffUtcMs = Date.UTC(year, month - 1, day, 12, 0, 0);
  const cutoffDate = new Date(cutoffUtcMs);

  const nowMs = now.getTime();

  if (nowMs >= cutoffUtcMs) {
    return {
      isOpen: false,
      reason: 'Advance registration for this event night closed 2 hours before the 7:30 PM IST start.',
      cutoffIso: cutoffDate.toISOString(),
    };
  }

  return {
    isOpen: true,
    cutoffIso: cutoffDate.toISOString(),
  };
}

module.exports = {
  buildCircleId,
  getBucketKey,
  shouldStartNewBucket,
  checkGenderCap,
  resolveSkillLevelGrouping,
  getIstTime,
  isLiveRegistrationOpen,
  isAdvanceRegistrationOpen,
};
