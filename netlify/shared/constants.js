/**
 * @file netlify/shared/constants.js
 * @description Core business rule constants for SoloSaathi Circle.
 *
 * Defines hard business limits, operational scheduling windows, authentication and rate-limiting
 * thresholds, circle nomenclature tokens, and pricing parameters governing attendee grouping,
 * safety protocols, and venue operations.
 */

// Maximum attendees of any single gender in a standard mixed circle to prevent male skew.
const GENDER_CAP = 10;

// Target minimum number of female attendees required to form a dedicated all-women circle.
const ALL_WOMEN_MIN_FLOOR = 4;

// Hard absolute minimum female attendees required to launch an all-women circle without merging.
const ALL_WOMEN_ABSOLUTE_MIN = 3;

// Upper attendee cap per circle before matching triggers a split into two separate circles.
const SOFT_MAX_GROUP = 24;

// Calendar start date for live festival registrations in Navratri 2026.
const LIVE_SEASON_START_DATE = '2026-10-13';

// Operating window for live walk-up registrations in IST (6:30 PM to 1:30 AM next day; wraps past midnight).
const LIVE_DAILY_WINDOW = Object.freeze({
  startHour: 18,
  startMinute: 30,
  endHour: 1,
  endMinute: 30,
});

// Nightly automated shutdown time in IST (1:00 AM) for ephemeral circle group chats.
const CHAT_AUTO_CLOSE_TIME = Object.freeze({
  hour: 1,
  minute: 0,
});

// Number of numeric digits in generated authentication OTPs.
const OTP_CODE_LENGTH = 6;

// Time in minutes before a generated OTP expires and can no longer be verified.
const OTP_EXPIRY_MINUTES = 10;

// Maximum failed OTP verification attempts permitted before locking the code.
const OTP_MAX_VERIFY_ATTEMPTS = 5;

// Mandatory waiting period in seconds between successive OTP resend requests.
const OTP_RESEND_COOLDOWN_SECONDS = 30;

// Maximum OTP send requests permitted for a mobile number within the rate-limit window.
const OTP_MAX_SENDS_PER_WINDOW = 3;

// Duration in minutes of the rolling window for OTP send rate-limiting.
const OTP_SEND_WINDOW_MINUTES = 15;

// Validity window in minutes of a verified mobile session before re-verification is required.
const OTP_VERIFIED_TTL_MINUTES = 30;

// Maximum times an attendee is permitted to change circles during a single event night.
const SWITCH_CIRCLE_MAX_PER_NIGHT = 3;

// Initial lock-in duration in minutes preventing an attendee from switching right after joining.
const SWITCH_CIRCLE_LOCK_MINUTES = 5;

// Cooldown period in minutes required between consecutive circle switches.
const SWITCH_CIRCLE_COOLDOWN_MINUTES = 20;

// Naming prefixes assigned to circles based on dancer skill tier or all-women preference.
const CIRCLE_PREFIX = Object.freeze({
  beginner: 'GARBA',
  intermediate: 'TAAL',
  advanced: 'RAAS',
  allWomen: 'SAKHI',
});

// Cultural Gujarati suffix terms used when generating unique circle display names.
const CIRCLE_NAME_ALTERNATES = Object.freeze([
  'TOLI',
  'DHOL',
  'DHAKLA',
  'TARANG',
  'MANDLI',
]);

// Default base and peak registration fees in INR (actual peak-date resolution handled in pricing.js).
const PRICING = Object.freeze({
  base: 199,
  peak: 249,
});

// Minimum attendee capacity threshold when an organizer opens additional circle capacity.
const GROW_MIN_SPOTS = 1;

// Maximum attendee capacity threshold allowed when expanding an active circle.
const GROW_MAX_SPOTS = 20;

// Exact wording must NOT be altered anywhere it's used — brand and sentiment verified for festival closing.
const CHAT_CLOSE_MESSAGE =
  "That's a wrap, Saathi! Raas over, circle closed — feet tired, heart fuller. Same ground, same magic, tomorrow?";

module.exports = {
  GENDER_CAP,
  ALL_WOMEN_MIN_FLOOR,
  ALL_WOMEN_ABSOLUTE_MIN,
  SOFT_MAX_GROUP,
  LIVE_SEASON_START_DATE,
  LIVE_DAILY_WINDOW,
  CHAT_AUTO_CLOSE_TIME,
  OTP_CODE_LENGTH,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_VERIFY_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_SENDS_PER_WINDOW,
  OTP_SEND_WINDOW_MINUTES,
  OTP_VERIFIED_TTL_MINUTES,
  SWITCH_CIRCLE_MAX_PER_NIGHT,
  SWITCH_CIRCLE_LOCK_MINUTES,
  SWITCH_CIRCLE_COOLDOWN_MINUTES,
  CIRCLE_PREFIX,
  CIRCLE_NAME_ALTERNATES,
  PRICING,
  GROW_MIN_SPOTS,
  GROW_MAX_SPOTS,
  CHAT_CLOSE_MESSAGE,
};
