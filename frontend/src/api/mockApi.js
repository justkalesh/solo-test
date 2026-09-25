/**
 * SoloSaathi Circle — demo backend (runs in the browser, no keys needed)
 *
 * Part of every build. ./mockMode.js sends a request here when it uses test contact details;
 * everything else goes to the Netlify Functions. `npm run frontend:mock` (VITE_USE_MOCK_API=true)
 * sends every request here.
 *
 * Test accounts (the same on every device; the data lives in each browser's localStorage):
 *   New signups     any number 9000000001–9000000999, OTP 123456
 *   Demo bookings   9000000000, OTP 123456: a live circle tonight (5 dancers, captain Aarav),
 *                   an upcoming advance booking (pool), and last night's circle
 *   Organizer       venue ID DEMO-UNIT, password demo1234 (Ahmedabad / United Way Garba Grounds)
 *   Payments        a fake checkout: pay successfully, payment fails, or a tampered signature
 *
 * The handlers copy the real functions in netlify/functions/: same validation, rules, error
 * messages, status codes and response shapes. KEEP THIS FILE IN SYNC when a backend rule or
 * contract changes. Deliberate differences:
 *   - Live registration ignores the 13 Oct / 6:30 PM–1:30 AM IST window unless
 *     `solosaathiMock.options.enforceLiveWindow = true`, so the flow can be demoed any time.
 *   - The OTP is always 123456 and is not sent anywhere.
 *   - Ticket "OCR" reads back the venue you selected (`options.ticketMismatch = true` for a mismatch).
 *   - The scheduled job (auto-finalize) runs before each demo request instead of every 15 minutes.
 *   - Signatures, tokens and organizer passwords use SHA-256 with demo secrets.
 *
 * Console helpers on `window.solosaathiMock` (available after the first demo request):
 *   .reset()              restore the demo data in this browser
 *   .finalizeAdvance()    stage 1 now: every advance pool becomes circles
 *   .mergeSmallCircles()  stage 2 now: circles of 1–3 merge into a neighbouring tier (<= 10)
 *   .options              { enforceLiveWindow, ticketMismatch, latencyMs }
 *   .db                   the current demo data
 */

import { MOCK_RAZORPAY_KEY_ID } from './mockMode.js';

// ---------------------------------------------------------------------------
// Business rules — copied from netlify/shared/constants.js and pricing.js (keep in sync)
// ---------------------------------------------------------------------------
const GENDER_CAP = 10;
const SOFT_MAX_GROUP = 24;
const LIVE_SEASON_START_DATE = '2026-10-13';
const LIVE_DAILY_WINDOW = { startHour: 18, startMinute: 30, endHour: 1, endMinute: 30 };
const EVENT_START_TIME_IST = { hour: 19, minute: 30 };
const ADVANCE_FINALIZE_HOURS_BEFORE_EVENT = 48;
const ADVANCE_EARLY_FINALIZE_POOL_SIZE = 12;
const MERGE_HOURS_BEFORE_EVENT = 12;
const SMALL_CIRCLE_MAX_MEMBERS = 3;
const MERGE_RECEIVER_MAX_MEMBERS = 10;
const SKILL_TIERS = ['beginner', 'intermediate', 'advanced'];
const GENDER_PREFS = ['mixed', 'allWomen'];
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_VERIFY_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const OTP_MAX_SENDS_PER_WINDOW = 3;
const OTP_SEND_WINDOW_MINUTES = 15;
const OTP_VERIFIED_TTL_MINUTES = 30;
const OTP_LOCKOUT_MINUTES = 15;
const ATTENDEE_SESSION_TTL_HOURS = 12;
const ORGANIZER_SESSION_TTL_HOURS = 12;
const SWITCH_CIRCLE_MAX_PER_NIGHT = 3;
const SWITCH_CIRCLE_LOCK_MINUTES = 5;
const SWITCH_CIRCLE_COOLDOWN_MINUTES = 20;
const GROW_MIN_SPOTS = 1;
const GROW_MAX_SPOTS = 20;
const CIRCLE_PREFIX = { beginner: 'GARBA', intermediate: 'TAAL', advanced: 'RAAS', allWomen: 'SAKHI' };
const PEAK_DATES = ['2026-10-17', '2026-10-18', '2026-10-24', '2026-10-25'];
const DEFAULT_MEETING_POINT = 'Near Main Festival Entrance / Information Desk';
const PHONE_ERROR =
  'whatsapp is required and must be a valid 10-digit Indian mobile number (e.g., 9876543210 or +919876543210)';

// Demo-only secrets and accounts; the real ones live in the root .env and Firestore
const DEMO_OTP = '123456';
const DEMO_PHONE = '9000000000';
const DEMO_ORGANIZER = {
  venueId: 'DEMO-UNIT',
  password: 'demo1234',
  city: 'Ahmedabad',
  venue: 'United Way Garba Grounds',
};
const MOCK_ADMIN_SECRET = 'test_admin_123';
const MOCK_SIGNING_SECRET = 'solosaathi_demo_signing_secret';
const MOCK_RAZORPAY_KEY_SECRET = 'mock_razorpay_key_secret';

const STORAGE_KEY = 'solosaathi_mock_db_v2';

export const mockOptions = {
  enforceLiveWindow: false,
  ticketMismatch: false,
  latencyMs: 400,
};

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Same envelope as netlify/shared/response.js
const ok = (data, status = 200) => jsonResponse({ success: true, data }, status);
const fail = (error, status = 400, details = null) =>
  jsonResponse({ success: false, error, details }, status);

function shiftDate(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

// Mirrors netlify/shared/keys.js
const slugify = (str) =>
  String(str ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
const compositeKey = (...parts) => parts.map(slugify).join('_');

function randomHex(bytes) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (b) => b.toString(16).padStart(2, '0')).join('');
}

function randomDigits(length) {
  let out = String(1 + Math.floor(Math.random() * 9));
  while (out.length < length) out += Math.floor(Math.random() * 10);
  return out;
}

/**
 * Synchronous SHA-256 (hex). crypto.subtle is unavailable when the dev server is opened over
 * plain http on a LAN IP (phone testing), so the mock carries its own implementation.
 */
function sha256Hex(message) {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const bytes = new TextEncoder().encode(message);
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(padded.length - 4, bitLength >>> 0);

  const W = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let t = 0; t < 16; t++) W[t] = view.getUint32(offset + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + W[t]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, h].forEach((value, i) => {
      H[i] = (H[i] + value) >>> 0;
    });
  }
  return Array.from(H, (x) => x.toString(16).padStart(8, '0')).join('');
}

function base64UrlEncode(text) {
  let binary = '';
  new TextEncoder().encode(text).forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(encoded) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '==='.slice((base64.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0)));
}

// ---------------------------------------------------------------------------
// Time rules — copy of netlify/shared/matching.js
// ---------------------------------------------------------------------------
function getIstTime(now = new Date()) {
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 5.5 * 3600000);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    hour: istDate.getHours(),
    minute: istDate.getMinutes(),
    dateString: `${istDate.getFullYear()}-${pad(istDate.getMonth() + 1)}-${pad(istDate.getDate())}`,
  };
}

function isLiveRegistrationOpen(now = new Date()) {
  const { hour, minute, dateString } = getIstTime(now);
  const currentMinutes = hour * 60 + minute;
  const startMinutes = LIVE_DAILY_WINDOW.startHour * 60 + LIVE_DAILY_WINDOW.startMinute;
  const endMinutes = LIVE_DAILY_WINDOW.endHour * 60 + LIVE_DAILY_WINDOW.endMinute;
  let inTimeWindow = false;
  let festivalDate = dateString;
  if (currentMinutes >= startMinutes) {
    inTimeWindow = true;
  } else if (currentMinutes <= endMinutes) {
    // 00:00–01:30 belongs to the previous evening's festival night
    inTimeWindow = true;
    festivalDate = shiftDate(dateString, -1);
  }
  if (!inTimeWindow) {
    return {
      isOpen: false,
      reason: 'Live registration operates daily from 6:30 PM to 1:30 AM IST only.',
      festivalDate,
    };
  }
  if (festivalDate < LIVE_SEASON_START_DATE) {
    return {
      isOpen: false,
      reason: `Live festival registration opens on ${LIVE_SEASON_START_DATE}.`,
      festivalDate,
    };
  }
  return { isOpen: true, festivalDate };
}

function formatIstTime({ hour, minute }) {
  const h12 = hour % 12 || 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

function getEventStartUtcMs(eventDateStr) {
  const [year, month, day] = String(eventDateStr).trim().split('-').map(Number);
  return Date.UTC(year, month - 1, day, EVENT_START_TIME_IST.hour, EVENT_START_TIME_IST.minute, 0) - 5.5 * 3600000;
}

const getHoursUntilEvent = (eventDateStr, nowMs = Date.now()) =>
  (getEventStartUtcMs(eventDateStr) - nowMs) / 3600000;

function isAdvanceRegistrationOpen(eventDateStr, now = new Date()) {
  if (now.getTime() >= getEventStartUtcMs(eventDateStr) - 2 * 3600000) {
    return {
      isOpen: false,
      reason: `Advance registration for this event night closed 2 hours before the ${formatIstTime(
        EVENT_START_TIME_IST
      )} IST start.`,
    };
  }
  return { isOpen: true };
}

// ---------------------------------------------------------------------------
// Circle rules — copies of netlify/shared/matching.js and circles.js
// ---------------------------------------------------------------------------
function getCirclePrefix(level, genderPref) {
  if (genderPref === 'allWomen') return CIRCLE_PREFIX.allWomen;
  return (level && CIRCLE_PREFIX[level]) || CIRCLE_PREFIX.beginner;
}

const padIndex = (index) => String(parseInt(index, 10) || 1).padStart(2, '0');

function buildCircleId(level, genderPref, index, { city, venue, eventDate }) {
  return `${getCirclePrefix(level, genderPref)}-${padIndex(index)}_${compositeKey(city, venue, eventDate)}`;
}

const buildCircleName = (level, genderPref, index) => `${getCirclePrefix(level, genderPref)} ${padIndex(index)}`;

function shouldStartNewBucket(circle) {
  if (typeof circle.totalCount === 'number') return circle.totalCount >= SOFT_MAX_GROUP;
  return Array.isArray(circle.members) && circle.members.length >= SOFT_MAX_GROUP;
}

function checkGenderCap(counts, newGender, isAllWomen = false) {
  if (isAllWomen || newGender === 'prefer_not_to_say') return false;
  if (newGender === 'male' && (counts.male || 0) + 1 > GENDER_CAP) return true;
  if (newGender === 'female' && (counts.female || 0) + 1 > GENDER_CAP) return true;
  return false;
}

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

function createCircleState({ level, genderPref, index, city, venue, eventDate, now, chatLinkPrefix = 'demo', origin = 'live' }) {
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

function adjustGenderCount(circle, gender, delta) {
  const field = gender === 'male' ? 'maleCount' : gender === 'female' ? 'femaleCount' : 'otherCount';
  circle[field] = Math.max(0, (circle[field] || 0) + delta);
}

function ensureCaptain(circle) {
  if (circle.captainId && circle.members.some((m) => m.registrationId === circle.captainId)) return;
  const captain = circle.members.find((m) => m.captainOptIn) || circle.members[0];
  circle.captainId = captain ? captain.registrationId : null;
  circle.captainName = captain ? captain.name : null;
  circle.members.forEach((m) => {
    m.isCaptain = Boolean(captain) && m.registrationId === captain.registrationId;
  });
}

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

/** Mirrors db.getCurrentCircleState(): follows `mergedInto`. */
function getCurrentCircle(db, circleId) {
  let circle = db.circles[circleId] || null;
  for (let hops = 0; circle && circle.status === 'merged' && circle.mergedInto && hops < 5; hops++) {
    circle = db.circles[circle.mergedInto] || null;
  }
  return circle;
}

// ---------------------------------------------------------------------------
// Mock database (localStorage stands in for Firestore)
// ---------------------------------------------------------------------------
let memoryDb = null;

function emptyDb() {
  return {
    otp: {},
    otplimit: {},
    verified: {},
    registrations: {},
    pools: {},
    groupstate: {},
    circles: {},
    showups: {},
    organizers: {},
  };
}

function loadDb() {
  // Re-read storage on every request so several open tabs don't overwrite each other's data
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memoryDb = JSON.parse(raw);
      return memoryDb;
    }
  } catch {
    // Storage blocked (private mode): keep the data in memory for this tab only
  }
  if (!memoryDb) {
    memoryDb = emptyDb();
    seedDemoData(memoryDb);
    saveDb();
  }
  return memoryDb;
}

function saveDb() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryDb));
  } catch {
    // Memory-only mode
  }
}

function resetMockData() {
  memoryDb = emptyDb();
  seedDemoData(memoryDb);
  saveDb();
  console.info('[demo] Data reset. Demo bookings re-created for WhatsApp', DEMO_PHONE);
  return 'Demo data reset';
}

const newRegistrationId = (type, now = Date.now()) => `reg_${type}_mock_${now}_${randomHex(6)}`;

function groupKey(city, venue, level, genderPref, eventDate) {
  return compositeKey(city, venue, level, genderPref, eventDate);
}

function seedRegistration(db, fields) {
  const registration = {
    ageBand: '25-34',
    allWomenToggle: false,
    captainOptIn: false,
    ticketSerial: 'MOCK-2026-00000',
    ticketPhoto: null,
    ticketVerifiedToken: null,
    paymentStatus: 'confirmed',
    createdAt: Date.now(),
    ...fields,
  };
  db.registrations[registration.id] = registration;
  return registration;
}

function seedCircle(db, { city, venue, level, eventDate, people, origin = 'live', createdAt = Date.now() }) {
  const now = Date.now();
  const circle = createCircleState({
    level,
    genderPref: 'mixed',
    index: 1,
    city,
    venue,
    eventDate,
    now: now - 30 * 60000,
    chatLinkPrefix: origin === 'advance' ? 'adv' : 'demo',
    origin,
  });
  people.forEach(([phone, name, gender, captainOptIn], i) => {
    const registration = seedRegistration(db, {
      id: newRegistrationId(origin === 'advance' ? 'adv' : 'live', now + i),
      name,
      whatsapp: phone,
      city,
      venue,
      gender,
      skillLevel: level,
      captainOptIn,
      registrationType: origin,
      eventDate,
      circleId: circle.circleId,
      createdAt,
    });
    circle.members.push(toCircleMember(registration, now - 30 * 60000));
    adjustGenderCount(circle, gender, 1);
  });
  circle.totalCount = circle.members.length;
  ensureCaptain(circle);
  db.circles[circle.circleId] = circle;
  db.groupstate[groupKey(city, venue, level, 'mixed', eventDate)] = {
    activeCircleId: circle.circleId,
    lastCircleCounter: 1,
    circleIds: [circle.circleId],
    updatedAt: now,
  };
  return circle;
}

/** Demo bookings for WhatsApp 9000000000 (dated relative to today, IST) and the demo organizer. */
function seedDemoData(db) {
  const today = getIstTime().dateString;
  const city = 'Ahmedabad';

  // Tonight: live registrations at United Way (intermediate, mixed) join this circle
  const tonight = seedCircle(db, {
    city,
    venue: 'United Way Garba Grounds',
    level: 'intermediate',
    eventDate: today,
    people: [
      ['9000009001', 'Aarav Mehta', 'male', true],
      ['9000009002', 'Ishita Rao', 'female', false],
      ['9000009003', 'Kabir Shah', 'male', false],
      ['9000009004', 'Diya Patel', 'female', false],
      [DEMO_PHONE, 'Demo Dancer', 'female', false],
    ],
  });
  db.showups[compositeKey(city, 'United Way Garba Grounds', today)] = {
    showupsArray: tonight.members.slice(0, 2).map((m) => ({
      registrationId: m.registrationId,
      circleId: tonight.circleId,
      checkedInAt: Date.now() - 10 * 60000,
      gate: 'Gate 3',
    })),
  };

  // Last night: a finished beginner circle at Rajpath Club
  seedCircle(db, {
    city,
    venue: 'Rajpath Club',
    level: 'beginner',
    eventDate: shiftDate(today, -1),
    createdAt: Date.now() - 2 * 86400000,
    people: [
      ['9000009011', 'Meera Joshi', 'female', true],
      ['9000009012', 'Rohan Desai', 'male', false],
      [DEMO_PHONE, 'Demo Dancer', 'female', false],
    ],
  });

  // Upcoming: a paid advance booking still waiting in the pool (the next peak night at least
  // 3 days away, so the 48-hour step hasn't run yet)
  const eventDate = PEAK_DATES.find((d) => d >= shiftDate(today, 3)) || shiftDate(today, 3);
  const venue = 'GMDC Ground';
  const poolArray = [
    [DEMO_PHONE, 'Demo Dancer', 'female', false],
    ['9000009021', 'Neha Iyer', 'female', true],
    ['9000009022', 'Arjun Nair', 'male', false],
  ].map(([phone, name, gender, captainOptIn], i) => {
    const registration = seedRegistration(db, {
      id: newRegistrationId('adv', Date.now() + i),
      name,
      whatsapp: phone,
      city,
      venue,
      gender,
      skillLevel: 'beginner',
      captainOptIn,
      ticketPhoto: '[PHOTO_STORED]',
      registrationType: 'advance',
      eventDate,
      circleId: null,
      createdAt: Date.now() - 86400000,
    });
    return {
      registrationId: registration.id,
      name,
      gender,
      ageBand: registration.ageBand,
      skillLevel: 'beginner',
      allWomenToggle: false,
      captainOptIn,
      joinedPoolAt: Date.now(),
    };
  });
  db.pools[groupKey(city, venue, 'beginner', 'mixed', eventDate)] = {
    poolArray,
    partition: { city, venue, level: 'beginner', genderPref: 'mixed', eventDate },
  };

  const salt = 'demo_salt';
  db.organizers[DEMO_ORGANIZER.venueId] = {
    venueId: DEMO_ORGANIZER.venueId,
    city: DEMO_ORGANIZER.city,
    venue: DEMO_ORGANIZER.venue,
    salt,
    passwordHash: sha256Hex(`${salt}:${DEMO_ORGANIZER.password}`),
    disabled: false,
  };
}

// ---------------------------------------------------------------------------
// Copies of the shared backend helpers (netlify/shared/*)
// ---------------------------------------------------------------------------
function isValidIndianMobile(number) {
  if (typeof number !== 'string' && typeof number !== 'number') return false;
  const cleaned = String(number).trim().replace(/[\s-]/g, '');
  return /^(?:\+91|91)?[6-9]\d{9}$/.test(cleaned);
}

function normalizePhone(phone) {
  const digits = String(phone || '').trim().replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

function validateRegistrationPayload(payload, { requirePhoto = false } = {}) {
  const errors = [];
  if (typeof payload.name !== 'string' || payload.name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string');
  }
  if (!isValidIndianMobile(payload.whatsapp)) errors.push(PHONE_ERROR);
  if (typeof payload.city !== 'string' || payload.city.trim().length === 0) {
    errors.push('city is required and must be a non-empty string');
  }
  if (typeof payload.venue !== 'string' || payload.venue.trim().length === 0) {
    errors.push('venue is required and must be a non-empty string');
  }
  if (!['male', 'female', 'prefer_not_to_say'].includes(payload.gender)) {
    errors.push('gender is required and must be one of: male, female, prefer_not_to_say');
  }
  if (typeof payload.ageBand !== 'string' || payload.ageBand.trim().length === 0) {
    errors.push('ageBand is required and must be a non-empty string');
  }
  if (!SKILL_TIERS.includes(payload.skillLevel)) {
    errors.push('skillLevel is required and must be one of: beginner, intermediate, advanced');
  }
  if (typeof payload.allWomenToggle !== 'boolean') {
    errors.push('allWomenToggle is required and must be a boolean');
  }
  if (typeof payload.captainOptIn !== 'boolean') {
    errors.push('captainOptIn is required and must be a boolean');
  }
  const hasPhoto = typeof payload.ticketPhoto === 'string' && payload.ticketPhoto.trim().length > 0;
  const hasSerial = typeof payload.ticketSerial === 'string' && payload.ticketSerial.trim().length > 0;
  if (requirePhoto && !hasPhoto) {
    errors.push('ticketPhoto is required as a non-empty base64 string when requirePhoto is enabled');
  } else if (!requirePhoto && !hasSerial && !hasPhoto) {
    errors.push('Either ticketSerial (string) or ticketPhoto (base64 string) must be provided');
  }
  return { valid: errors.length === 0, errors };
}

function getPrice(dateString) {
  return typeof dateString === 'string' && PEAK_DATES.includes(dateString.trim()) ? 249 : 199;
}

// ---------------------------------------------------------------------------
// Sessions — copies of netlify/shared/session.js and organizer/admin-auth.js (demo signatures)
// ---------------------------------------------------------------------------
const signToken = (scope, payloadB64) => sha256Hex(`${MOCK_SIGNING_SECRET}.${scope}.${payloadB64}`);

function createToken(scope, payload) {
  const payloadB64 = base64UrlEncode(JSON.stringify({ ...payload, mock: true }));
  return `${payloadB64}.${signToken(scope, payloadB64)}`;
}

function readToken(scope, token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2 || parts[1] !== signToken(scope, parts[0])) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[0]));
  } catch {
    return null;
  }
}

const bearer = (headers) => String(headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

function createAttendeeToken(phone, now = Date.now()) {
  return createToken('attendee', {
    phone,
    role: 'attendee',
    iat: now,
    exp: now + ATTENDEE_SESSION_TTL_HOURS * 3600 * 1000,
  });
}

function verifyAttendeeToken(token) {
  if (!token) return { valid: false, error: 'Missing session token.' };
  const payload = readToken('attendee', token);
  if (!payload || payload.role !== 'attendee' || !payload.phone) {
    return { valid: false, error: 'Invalid session token.' };
  }
  if (Date.now() > payload.exp) {
    return { valid: false, error: 'Your session has expired. Please verify your number again.' };
  }
  return { valid: true, phone: payload.phone };
}

function requireAttendee(headers) {
  const result = verifyAttendeeToken(bearer(headers));
  if (!result.valid) {
    return {
      phone: null,
      response: fail(`${result.error} Verify your WhatsApp number with OTP to continue.`, 401, {
        sessionRequired: true,
      }),
    };
  }
  return { phone: result.phone, response: null };
}

function createOrganizerToken({ venueId, city, venue }) {
  const now = Date.now();
  return createToken('organizer', {
    venueId,
    city: city || null,
    venue: venue || null,
    role: 'venue_organizer',
    iat: now,
    exp: now + ORGANIZER_SESSION_TTL_HOURS * 3600 * 1000,
  });
}

function verifyOrganizerToken(token) {
  if (!token || typeof token !== 'string') return { valid: false, error: 'Token missing or invalid.' };
  if (token.split('.').length !== 2) return { valid: false, error: 'Malformed token format.' };
  const payload = readToken('organizer', token);
  if (!payload) return { valid: false, error: 'Invalid token signature.' };
  if (Date.now() > payload.exp) return { valid: false, error: 'Organizer session token expired.' };
  return { valid: true, venueId: payload.venueId, city: payload.city, venue: payload.venue, isMaster: false };
}

// ---------------------------------------------------------------------------
// Simulated external services
// ---------------------------------------------------------------------------
const VENUE_STOP_WORDS = new Set([
  'grounds', 'ground', 'club', 'stadium', 'lakefront', 'complex', 'centre', 'center', 'hall',
  'party', 'plot', 'garba', 'navratri', 'road', 'near', 'opp', 'the', 'and',
]);

function extractVenueKeywords(str) {
  if (!str || typeof str !== 'string') return [];
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !VENUE_STOP_WORDS.has(w));
}

function checkVenueMismatch(extractedVenue, selectedVenue) {
  const normSelected = String(selectedVenue || '').trim();
  const normExtracted = String(extractedVenue || '').trim();
  if (!normExtracted) return { hasMismatch: false, warning: null };
  const selectedWords = extractVenueKeywords(normSelected);
  const extractedWords = extractVenueKeywords(normExtracted);
  const hasKeywordOverlap = extractedWords.some((word) =>
    selectedWords.some((selWord) => selWord.includes(word) || word.includes(selWord))
  );
  if (!hasKeywordOverlap && selectedWords.length > 0 && extractedWords.length > 0) {
    return {
      hasMismatch: true,
      warning: `Your ticket appears to be for "${normExtracted}", which does not match your selected ground ("${normSelected}"). Please confirm your ground location before entering.`,
    };
  }
  return { hasMismatch: false, warning: null };
}

/** Stand-in for Gemini OCR: "reads" the venue the attendee selected, or another one on request. */
function mockExtractTicketInfo(selectedVenue) {
  let venue = selectedVenue || null;
  if (mockOptions.ticketMismatch) {
    venue = /rajpath/i.test(selectedVenue || '') ? 'GMDC Ground' : 'Rajpath Club';
  }
  const extracted = {
    city: null,
    venue,
    venue_english: venue,
    pass_id: `MOCK-2026-${randomDigits(5)}`,
    looks_like_valid_ticket: true,
  };
  return { ...extracted, ticketVerifiedToken: `mock.${sha256Hex(JSON.stringify(extracted)).slice(0, 24)}` };
}

// Demo Razorpay signature (the real check is an HMAC with RAZORPAY_KEY_SECRET)
const mockPaymentSignature = (orderId, paymentId) =>
  sha256Hex(`${orderId}|${paymentId}|${MOCK_RAZORPAY_KEY_SECRET}`);

// ---------------------------------------------------------------------------
// Matching — copy of netlify/shared/payment-helpers.js joinMatchingBucket()
// ---------------------------------------------------------------------------
function joinMatchingBucket(db, registration) {
  const now = Date.now();
  const registrationType = registration.registrationType || 'live';
  const genderPref = registration.allWomenToggle ? 'allWomen' : 'mixed';
  const level = registration.skillLevel || 'beginner';
  const { eventDate, city, venue } = registration;

  if (registrationType === 'live') {
    const storedCircleId = db.registrations[registration.id]?.circleId || registration.circleId;
    if (storedCircleId && db.circles[storedCircleId]) {
      return {
        success: true,
        type: 'live',
        circleId: storedCircleId,
        circle: circleSummary(db.circles[storedCircleId], registration.id),
        alreadyJoined: true,
      };
    }

    const key = groupKey(city, venue, level, genderPref, eventDate);
    const groupState = db.groupstate[key] || null;
    let activeCircleId = groupState?.activeCircleId || null;
    let circleCounter = groupState?.lastCircleCounter || 0;
    let circleState = activeCircleId && db.circles[activeCircleId] ? structuredClone(db.circles[activeCircleId]) : null;

    let needNewCircle = !circleState || circleState.status !== 'active' || circleState.isLocked;
    if (!needNewCircle) {
      if (shouldStartNewBucket(circleState)) needNewCircle = true;
      if (
        checkGenderCap(
          { male: circleState.maleCount, female: circleState.femaleCount },
          registration.gender,
          registration.allWomenToggle
        )
      ) {
        needNewCircle = true;
      }
    }

    const isNewCircle = needNewCircle;
    if (needNewCircle) {
      circleCounter += 1;
      circleState = createCircleState({ level, genderPref, index: circleCounter, city, venue, eventDate, now });
      activeCircleId = circleState.circleId;
    }

    const newMember = toCircleMember(registration, now);
    if (registration.captainOptIn && !circleState.captainId) {
      newMember.isCaptain = true;
      circleState.captainId = registration.id;
      circleState.captainName = registration.name;
    }
    circleState.members = [...(circleState.members || []), newMember];
    circleState.totalCount = circleState.members.length;
    adjustGenderCount(circleState, registration.gender, 1);
    if (!circleState.captainId) {
      circleState.captainId = circleState.members[0].registrationId;
      circleState.captainName = circleState.members[0].name;
      circleState.members[0].isCaptain = true;
    }

    db.circles[activeCircleId] = { ...(db.circles[activeCircleId] || {}), ...circleState };
    const circleIds = groupState?.circleIds || [];
    db.groupstate[key] = {
      ...(groupState || {}),
      activeCircleId,
      lastCircleCounter: circleCounter,
      circleIds: isNewCircle && !circleIds.includes(activeCircleId) ? [...circleIds, activeCircleId] : circleIds,
      updatedAt: now,
    };
    db.registrations[registration.id] = { ...db.registrations[registration.id], circleId: activeCircleId, updatedAt: now };
    return {
      success: true,
      type: 'live',
      circleId: activeCircleId,
      circle: circleSummary(circleState, registration.id),
      alreadyJoined: false,
    };
  }

  if (registrationType === 'advance') {
    const key = groupKey(city, venue, level, genderPref, eventDate);
    const pool = db.pools[key]?.poolArray || [];
    if (pool.some((item) => item.registrationId === registration.id)) {
      return { success: true, type: 'advance', eventDate, poolSize: pool.length, alreadyJoined: true };
    }
    const nextPool = [
      ...pool,
      {
        registrationId: registration.id,
        name: registration.name,
        gender: registration.gender,
        ageBand: registration.ageBand,
        skillLevel: registration.skillLevel,
        allWomenToggle: Boolean(registration.allWomenToggle),
        captainOptIn: Boolean(registration.captainOptIn),
        joinedPoolAt: now,
      },
    ];
    db.pools[key] = {
      ...(db.pools[key] || {}),
      poolArray: nextPool,
      partition: { city, venue, level, genderPref, eventDate },
    };
    return { success: true, type: 'advance', eventDate, poolSize: nextPool.length, alreadyJoined: false };
  }

  throw new Error(`[joinMatchingBucket] Unknown registrationType: '${registrationType}'`);
}

// ---------------------------------------------------------------------------
// Advance circles — copy of netlify/shared/advance-circles.js
// ---------------------------------------------------------------------------
function formCirclesFromPool(db, { city, venue, level, genderPref, eventDate }, now = Date.now()) {
  const key = groupKey(city, venue, level, genderPref, eventDate);
  const pool = db.pools[key]?.poolArray || [];
  if (pool.length === 0) return { circleIds: [], placed: 0 };

  const isAllWomen = genderPref === 'allWomen';
  const groupState = db.groupstate[key] || {};
  let counter = groupState.lastCircleCounter || 0;
  const knownCircleIds = new Set(groupState.circleIds || (groupState.activeCircleId ? [groupState.activeCircleId] : []));

  let active = groupState.activeCircleId && db.circles[groupState.activeCircleId]
    ? structuredClone(db.circles[groupState.activeCircleId])
    : null;
  if (active && (active.status !== 'active' || active.isLocked || active.origin !== 'advance' || shouldStartNewBucket(active))) {
    active = null;
  }

  const touched = new Map();
  const placedMembers = new Map();
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
      const capped = checkGenderCap({ male: active.maleCount, female: active.femaleCount }, attendee.gender, isAllWomen);
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
    if (remaining.length > 0) active = null;
  }

  for (const circle of touched.values()) {
    db.circles[circle.circleId] = { ...(db.circles[circle.circleId] || {}), ...circle };
  }
  for (const [registrationId, circleId] of placedMembers) {
    db.registrations[registrationId] = { ...db.registrations[registrationId], circleId, updatedAt: now };
  }
  db.pools[key] = { ...db.pools[key], poolArray: [] };
  const lastCircle = [...touched.values()].pop();
  db.groupstate[key] = {
    ...groupState,
    activeCircleId: lastCircle.circleId,
    lastCircleCounter: counter,
    circleIds: [...knownCircleIds],
    updatedAt: now,
  };
  return { circleIds: [...touched.keys()], placed: placedMembers.size };
}

function loadNightCircles(db, city, venue, genderPref, eventDate) {
  const circles = [];
  for (const level of SKILL_TIERS) {
    const groupState = db.groupstate[groupKey(city, venue, level, genderPref, eventDate)];
    const ids = groupState?.circleIds || (groupState?.activeCircleId ? [groupState.activeCircleId] : []);
    for (const circleId of ids) {
      const circle = db.circles[circleId];
      if (circle && circle.status === 'active' && circle.origin === 'advance') circles.push(circle);
    }
  }
  return circles;
}

function mergeSmallCirclesForNight(db, { city, venue, eventDate }, now = Date.now()) {
  const allMoves = [];
  const allFlagged = [];

  for (const genderPref of GENDER_PREFS) {
    const circles = loadNightCircles(db, city, venue, genderPref, eventDate);
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

    for (const { from, to } of moves) {
      const source = byId.get(from);
      const target = byId.get(to);
      for (const member of source.members || []) {
        target.members = [...(target.members || []), { ...member, isCaptain: false }];
        adjustGenderCount(target, member.gender, 1);
        db.registrations[member.registrationId] = { ...db.registrations[member.registrationId], circleId: to, updatedAt: now };
      }
      target.totalCount = target.members.length;
      target.needsOrganizerAttention = false;
      target.updatedAt = now;
      ensureCaptain(target);

      Object.assign(source, {
        members: [],
        totalCount: 0,
        maleCount: 0,
        femaleCount: 0,
        otherCount: 0,
        captainId: null,
        captainName: null,
        status: 'merged',
        mergedInto: to,
        mergedAt: now,
        needsOrganizerAttention: false,
      });
    }

    for (const circle of circles) {
      if (circle.status === 'active') circle.needsOrganizerAttention = flagged.includes(circle.circleId);
    }
    for (const level of SKILL_TIERS) {
      const key = groupKey(city, venue, level, genderPref, eventDate);
      if (db.groupstate[key]) db.groupstate[key].mergeCheckedAt = now;
    }

    allMoves.push(...moves);
    allFlagged.push(...flagged);
  }

  return { moves: allMoves, flagged: allFlagged };
}

const poolPartitions = (db) =>
  Object.values(db.pools)
    .filter((pool) => pool.partition && (pool.poolArray || []).length > 0)
    .map((pool) => ({ ...pool.partition, size: pool.poolArray.length }));

function advanceNights(db) {
  const nights = new Map();
  Object.values(db.circles)
    .filter((c) => c.status === 'active' && c.origin === 'advance')
    .forEach((c) => nights.set(compositeKey(c.city, c.venue, c.eventDate), { city: c.city, venue: c.venue, eventDate: c.eventDate }));
  return [...nights.values()];
}

/** What scheduled/auto-finalize.js does every 15 minutes, run before each demo request. */
function runScheduledJobs(db, now = Date.now()) {
  for (const partition of poolPartitions(db)) {
    const hoursUntilEvent = getHoursUntilEvent(partition.eventDate, now);
    if (hoursUntilEvent <= 0) continue;
    if (hoursUntilEvent > ADVANCE_FINALIZE_HOURS_BEFORE_EVENT && partition.size < ADVANCE_EARLY_FINALIZE_POOL_SIZE) continue;
    formCirclesFromPool(db, partition, now);
  }
  for (const night of advanceNights(db)) {
    const hoursUntilEvent = getHoursUntilEvent(night.eventDate, now);
    if (hoursUntilEvent > 0 && hoursUntilEvent <= MERGE_HOURS_BEFORE_EVENT) {
      mergeSmallCirclesForNight(db, night, now);
    }
  }
}

/** Console helper: stage 1 now, for every advance pool (ignores the 48-hour timing). */
function finalizeAdvance() {
  const db = loadDb();
  const results = poolPartitions(db).map((partition) => {
    const { circleIds, placed } = formCirclesFromPool(db, partition);
    return { ...partition, placed, circleIds: circleIds.join(', ') };
  });
  saveDb();
  console.table(results);
  return `${results.length} pool(s) turned into circles`;
}

/** Console helper: stage 2 now, for every night with advance circles (ignores the 12-hour timing). */
function mergeSmallCircles() {
  const db = loadDb();
  const results = advanceNights(db).map((night) => {
    const { moves, flagged } = mergeSmallCirclesForNight(db, night);
    return { ...night, merges: moves.map((m) => `${m.from} -> ${m.to}`).join('; '), flagged: flagged.join(', ') };
  });
  saveDb();
  console.table(results);
  return `${results.length} night(s) checked`;
}

// ---------------------------------------------------------------------------
// Endpoint handlers — one per Netlify Function
// ---------------------------------------------------------------------------
function handleSendOtp({ method, body, db }) {
  if (method !== 'POST') return fail('Method Not Allowed. Use POST.', 405);
  if (!isValidIndianMobile(body.whatsapp)) return fail(PHONE_ERROR, 400, [PHONE_ERROR]);

  const phone = normalizePhone(body.whatsapp);
  const now = Date.now();
  const existing = db.otp[phone];
  if (existing?.isBlocked) {
    const lockoutEndsAt = (existing.blockedAt || 0) + OTP_LOCKOUT_MINUTES * 60 * 1000;
    if (now < lockoutEndsAt) {
      const minutesLeft = Math.ceil((lockoutEndsAt - now) / 60000);
      return fail(`Too many wrong codes. For your security, please try again in ${minutesLeft} minute(s).`, 429, {
        hardBlocked: true,
        lockoutMinutesRemaining: minutesLeft,
      });
    }
  }

  const rateLimit = db.otplimit[phone];
  let currentCount = 1;
  let windowStartTime = now;
  if (rateLimit) {
    if (rateLimit.lastSentAt && now - rateLimit.lastSentAt < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
      const cooldownRemaining = Math.ceil((OTP_RESEND_COOLDOWN_SECONDS * 1000 - (now - rateLimit.lastSentAt)) / 1000);
      return fail(`Please wait ${cooldownRemaining} second(s) before requesting another OTP.`, 429, {
        cooldownRemainingSeconds: cooldownRemaining,
      });
    }
    const windowElapsed = now - (rateLimit.windowStartTime || now);
    if (windowElapsed < OTP_SEND_WINDOW_MINUTES * 60 * 1000) {
      if (rateLimit.count >= OTP_MAX_SENDS_PER_WINDOW) {
        const resetSeconds = Math.ceil((OTP_SEND_WINDOW_MINUTES * 60 * 1000 - windowElapsed) / 1000);
        return fail(
          `Maximum of ${OTP_MAX_SENDS_PER_WINDOW} OTP requests reached for this 15-minute window. Please try again later.`,
          429,
          { windowResetSeconds: resetSeconds }
        );
      }
      currentCount = rateLimit.count + 1;
      windowStartTime = rateLimit.windowStartTime;
    }
  }

  db.otp[phone] = {
    code: DEMO_OTP,
    expiresAt: now + OTP_EXPIRY_MINUTES * 60 * 1000,
    attempts: 0,
    isBlocked: false,
    createdAt: now,
  };
  db.otplimit[phone] = { count: currentCount, windowStartTime, lastSentAt: now };
  console.info(`[demo] Test number +91 ${phone}: the OTP is ${DEMO_OTP}`);
  return ok({
    message: 'Verification code dispatched successfully.',
    deliveryChannel: 'whatsapp',
    cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  });
}

function handleVerifyOtp({ method, body, db }) {
  if (method !== 'POST') return fail('Method Not Allowed. Use POST.', 405);
  const errors = [];
  if (!isValidIndianMobile(body.whatsapp)) errors.push(PHONE_ERROR);
  const codeStr =
    typeof body.code === 'string' ? body.code.trim() : typeof body.code === 'number' ? String(body.code) : '';
  if (!/^\d{6}$/.test(codeStr)) errors.push('code is required and must be a 6-digit numeric string');
  if (errors.length > 0) return fail(errors.join('; '), 400, errors);

  const phone = normalizePhone(body.whatsapp);
  const now = Date.now();
  const otpRecord = db.otp[phone];
  if (!otpRecord || !otpRecord.code) {
    return fail('No active verification code found for this mobile number. Please request a new OTP.', 400);
  }
  if (otpRecord.isBlocked) {
    return fail(
      'This code is locked after 5 wrong attempts. You can request a new code 15 minutes after the lockout.',
      403,
      { hardBlocked: true }
    );
  }
  if (now > otpRecord.expiresAt) {
    return fail('The verification code has expired (valid for 10 minutes). Please request a fresh OTP.', 400, {
      expired: true,
    });
  }
  if (otpRecord.code !== codeStr) {
    const currentAttempts = (otpRecord.attempts || 0) + 1;
    if (currentAttempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      db.otp[phone] = {
        ...otpRecord,
        attempts: currentAttempts,
        isBlocked: true,
        blockedAt: now,
        expiresAt: Math.max(otpRecord.expiresAt || 0, now + OTP_LOCKOUT_MINUTES * 60 * 1000),
      };
      return fail(
        'Too many wrong codes (5). This code is now locked; you can request a new code in 15 minutes.',
        403,
        { hardBlocked: true, attempts: currentAttempts }
      );
    }
    db.otp[phone] = { ...otpRecord, attempts: currentAttempts };
    const attemptsRemaining = OTP_MAX_VERIFY_ATTEMPTS - currentAttempts;
    return fail(
      `Invalid verification code. ${attemptsRemaining} attempt(s) remaining before a 15-minute lockout.`,
      400,
      { attemptsRemaining }
    );
  }

  db.verified[phone] = { verified: true, verifiedAt: now, expiresAt: now + OTP_VERIFIED_TTL_MINUTES * 60 * 1000 };
  db.otp[phone] = { ...otpRecord, code: null, expiresAt: 0, attempts: 0, isBlocked: false, consumedAt: now };
  return ok({
    verified: true,
    whatsapp: phone,
    verifiedTtlMinutes: OTP_VERIFIED_TTL_MINUTES,
    sessionToken: createAttendeeToken(phone, now),
    message:
      'Mobile number verified successfully. You have 30 minutes to complete registration without re-verifying.',
  });
}

/** Mirrors db.getVerifiedStatus(): an expired session reads as "not verified". */
function checkVerifiedSession(db, phone, now) {
  const status = db.verified[phone];
  const active = status && !(status.expiresAt && now > status.expiresAt) ? status : null;
  if (!active || !active.verified) {
    return fail('Mobile number has not completed OTP verification. Please verify with OTP before registering.', 401);
  }
  if (now - (active.verifiedAt || 0) > OTP_VERIFIED_TTL_MINUTES * 60 * 1000) {
    return fail('Your OTP verification session has expired. Please verify your mobile number again.', 401, {
      expired: true,
    });
  }
  return null;
}

function handleVerifyTicket({ method, body }) {
  if (method !== 'POST') return fail('Method Not Allowed. Use POST.', 405);
  if (!body.ticketPhoto || typeof body.ticketPhoto !== 'string') {
    return fail('ticketPhoto is required as a base64 encoded string.', 400);
  }
  const extracted = mockExtractTicketInfo(body.selectedVenue);
  const mismatch = checkVenueMismatch(extracted.venue || extracted.venue_english, body.selectedVenue);
  return ok({ ...extracted, mismatchWarning: mismatch.hasMismatch ? mismatch.warning : null });
}

function ticketCheck(body) {
  const warnings = [];
  let ticketVerifiedToken = null;
  if (body.ticketPhoto && typeof body.ticketPhoto === 'string') {
    const ticketInfo = mockExtractTicketInfo(body.venue);
    ticketVerifiedToken = ticketInfo.ticketVerifiedToken;
    const mismatch = checkVenueMismatch(ticketInfo.venue, body.venue);
    if (mismatch.hasMismatch) warnings.push(mismatch.warning);
  }
  return { warnings, ticketVerifiedToken };
}

function draftRegistration(body, phone, extra) {
  return {
    name: body.name,
    whatsapp: phone,
    city: body.city,
    venue: body.venue,
    gender: body.gender,
    ageBand: body.ageBand,
    skillLevel: body.skillLevel,
    allWomenToggle: body.allWomenToggle,
    captainOptIn: body.captainOptIn,
    ticketSerial: body.ticketSerial || null,
    paymentStatus: 'pending',
    circleId: null,
    ...extra,
  };
}

function handleRegister({ method, body, db }) {
  if (method !== 'POST') return fail('Method Not Allowed. Use POST.', 405);
  const validation = validateRegistrationPayload(body);
  if (!validation.valid) return fail(validation.errors.join('; '), 400, validation.errors);

  const windowCheck = isLiveRegistrationOpen();
  if (!windowCheck.isOpen && mockOptions.enforceLiveWindow) return fail(windowCheck.reason, 403);
  const festivalDate = windowCheck.festivalDate;

  const phone = normalizePhone(body.whatsapp);
  const now = Date.now();
  const sessionError = checkVerifiedSession(db, phone, now);
  if (sessionError) return sessionError;

  const { warnings, ticketVerifiedToken } = ticketCheck(body);
  const registrationId = newRegistrationId('live', now);
  db.registrations[registrationId] = {
    id: registrationId,
    ...draftRegistration(body, phone, {
      ticketPhoto: body.ticketPhoto ? '[PHOTO_STORED]' : null,
      ticketVerifiedToken,
      registrationType: 'live',
      eventDate: festivalDate,
      createdAt: now,
    }),
  };
  return ok(
    {
      registrationId,
      paymentStatus: 'pending',
      eventDate: festivalDate,
      city: body.city,
      venue: body.venue,
      registrationType: 'live',
      warnings: warnings.length > 0 ? warnings : null,
      nextStep: { action: 'create_order', endpoint: '/.netlify/functions/create-order', params: { registrationId } },
      message: 'Live registration draft created. Please proceed to payment to enter your festival circle.',
    },
    201
  );
}

function handleAdvanceRegister({ method, body, db }) {
  if (method !== 'POST') return fail('Method Not Allowed. Use POST.', 405);
  const validation = validateRegistrationPayload(body, { requirePhoto: true });
  if (!validation.valid) return fail(validation.errors.join('; '), 400, validation.errors);

  const eventDate = String(body.eventDate || '').trim();
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return fail('eventDate is required in YYYY-MM-DD format for advance registration.', 400);
  }
  const advanceCheck = isAdvanceRegistrationOpen(eventDate);
  if (!advanceCheck.isOpen) return fail(advanceCheck.reason, 403);

  const phone = normalizePhone(body.whatsapp);
  const now = Date.now();
  const sessionError = checkVerifiedSession(db, phone, now);
  if (sessionError) return sessionError;

  const { warnings, ticketVerifiedToken } = ticketCheck(body);
  const registrationId = newRegistrationId('adv', now);
  db.registrations[registrationId] = {
    id: registrationId,
    ...draftRegistration(body, phone, {
      ticketPhoto: '[PHOTO_STORED]',
      ticketVerifiedToken,
      registrationType: 'advance',
      eventDate,
      createdAt: now,
    }),
  };
  return ok(
    {
      registrationId,
      status: 'pending_payment',
      eventDate,
      paymentStatus: 'pending',
      city: body.city,
      venue: body.venue,
      registrationType: 'advance',
      warnings: warnings.length > 0 ? warnings : null,
      nextStep: { action: 'create_order', endpoint: '/.netlify/functions/create-order', params: { registrationId } },
      message:
        'Advance registration draft created. Please complete payment to enter the matching pool. Circles will be finalized and announced 48 hours prior to the event.',
    },
    201
  );
}

function handleCreateOrder({ method, body, db }) {
  if (method !== 'POST') return fail('Method Not Allowed. Use POST.', 405);
  const registrationId = String(body.registrationId || '').trim();
  if (!registrationId) return fail('registrationId is required to create a payment order.', 400);

  const registration = db.registrations[registrationId];
  if (!registration) {
    return fail(
      `Registration record not found for id: '${registrationId}'. Please register before initiating payment.`,
      404
    );
  }
  if (registration.paymentStatus === 'confirmed' || registration.paymentStatus === 'paid') {
    return fail('Payment for this registration has already been confirmed. No new order needed.', 400, {
      registrationId,
      paymentStatus: registration.paymentStatus,
      orderId: registration.orderId,
      circleId: registration.circleId || null,
    });
  }
  const eventDate = registration.eventDate || body.date;
  if (!eventDate) return fail('Missing event date on registration record.', 400);

  const priceInRupees = getPrice(eventDate);
  const orderId = `order_mock_${randomHex(7)}`;
  db.registrations[registrationId] = {
    ...registration,
    orderId,
    amount: priceInRupees * 100,
    currency: 'INR',
    orderCreatedAt: Date.now(),
  };
  return ok(
    { orderId, amount: priceInRupees * 100, currency: 'INR', keyId: MOCK_RAZORPAY_KEY_ID, registrationId, eventDate, priceInRupees },
    201
  );
}

function handleVerifyPayment({ method, body, db }) {
  if (method !== 'POST') return fail('Method Not Allowed. Use POST.', 405);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !registrationId) {
    return fail(
      'Missing required verification fields: razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId.',
      400
    );
  }
  const registration = db.registrations[registrationId];
  if (!registration) return fail(`Registration record not found for id: '${registrationId}'.`, 404);
  if (!registration.orderId || registration.orderId !== razorpay_order_id) {
    return fail('Order ID mismatch. The payment order submitted does not match the registration record.', 400);
  }
  if (razorpay_signature !== mockPaymentSignature(razorpay_order_id, razorpay_payment_id)) {
    db.registrations[registrationId] = {
      ...registration,
      paymentStatus: 'failed',
      paymentFailureReason: 'Signature verification failed',
      failedAt: Date.now(),
    };
    return fail('Invalid payment signature. Payment verification failed; attendee has not been placed into matching.', 400);
  }

  const updatedRegistration = {
    ...registration,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    paymentSignature: razorpay_signature,
    paymentStatus: 'confirmed',
    paidAt: Date.now(),
  };
  db.registrations[registrationId] = updatedRegistration;
  const matching = joinMatchingBucket(db, updatedRegistration);
  return ok({
    registrationId,
    paymentStatus: 'confirmed',
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    matching,
    message:
      registration.registrationType === 'live'
        ? 'Payment confirmed! You have been matched into your festival circle.'
        : 'Payment confirmed! You have been added to the advance matching pool.',
  });
}

/** Copy of netlify/functions/circle/circle-actions.js */
function handleCircleActions({ method, body, headers, db }) {
  if (method !== 'POST') return fail('Method Not Allowed. Use POST.', 405);
  const { action, registrationId } = body;
  if (!action || typeof action !== 'string') return fail("Missing required 'action' parameter.", 400);

  const caller = requireAttendee(headers);
  if (caller.response) return caller.response;
  if (!registrationId) return fail('registrationId is required for circle actions.', 400);

  const now = Date.now();
  const registration = db.registrations[registrationId];
  if (!registration || registration.whatsapp !== caller.phone) {
    return fail('This registration does not belong to the verified number.', 403);
  }

  if (action === 'showup') {
    const { city, venue, eventDate } = registration;
    const showupKey = compositeKey(city, venue, eventDate);
    const showups = db.showups[showupKey]?.showupsArray || [];
    if (showups.some((s) => s.registrationId === registrationId)) {
      return ok({ message: 'Attendee already checked in.', alreadyCheckedIn: true, totalShowups: showups.length });
    }
    db.showups[showupKey] = {
      showupsArray: [
        ...showups,
        { registrationId, circleId: registration.circleId || null, checkedInAt: now, gate: body.gate || 'Main Gate' },
      ],
    };
    return ok({ message: 'Attendee check-in recorded successfully.', checkedInAt: now, totalShowups: showups.length + 1 });
  }

  const circleId = body.circleId || registration.circleId;
  if (!circleId) return fail('circleId is required for this action.', 400);
  if (registration.circleId !== circleId) return fail('You are not a member of this circle.', 403);
  const circle = db.circles[circleId];
  if (!circle) return fail(`Circle '${circleId}' not found.`, 404);

  const notCaptain = circle.captainId === registrationId ? null : fail('Only the Circle Captain can do this.', 403);

  if (action === 'grow') {
    if (notCaptain) return notCaptain;
    const additionalSpots = parseInt(body.spots, 10) || 5;
    if (additionalSpots < GROW_MIN_SPOTS || additionalSpots > GROW_MAX_SPOTS) {
      return fail(`Can only grow between ${GROW_MIN_SPOTS} and ${GROW_MAX_SPOTS} spots. Requested: ${additionalSpots}.`, 400);
    }
    circle.maxSpots = (circle.maxSpots || SOFT_MAX_GROUP) + additionalSpots;
    circle.isLocked = false;
    circle.status = 'active';
    circle.updatedAt = now;
    return ok({
      message: `Circle unlocked and expanded by ${additionalSpots} spots.`,
      circleId,
      isLocked: false,
      maxSpots: circle.maxSpots,
      currentMembers: circle.totalCount,
    });
  }

  if (action === 'lock') {
    if (notCaptain) return notCaptain;
    circle.isLocked = true;
    circle.lockedAt = now;
    circle.updatedAt = now;
    return ok({ message: 'Circle is now locked to new members.', circleId, isLocked: true });
  }

  if (action === 'leave') {
    const memberIndex = circle.members.findIndex((m) => m.registrationId === registrationId);
    if (memberIndex === -1) return fail('Attendee is not currently a member of this circle.', 404);
    const [leavingMember] = circle.members.splice(memberIndex, 1);
    circle.totalCount = circle.members.length;
    adjustGenderCount(circle, leavingMember.gender, -1);
    let newCaptainName = null;
    if (circle.captainId === registrationId) {
      circle.captainId = null;
      ensureCaptain(circle);
      newCaptainName = circle.captainName;
    }
    circle.updatedAt = now;
    db.registrations[registrationId] = { ...registration, circleId: null, updatedAt: now };
    return ok({ message: 'Left circle successfully.', circleId, remainingMembers: circle.totalCount, newCaptain: newCaptainName });
  }

  if (action === 'transferCaptain') {
    if (notCaptain) return notCaptain;
    const { newCaptainId, cancelTransfer } = body;
    if (cancelTransfer) {
      circle.pendingCaptainTransfer = null;
      return ok({ message: 'Captain transfer cancelled.', circleId });
    }
    const targetMember = circle.members.find((m) => m.registrationId === newCaptainId);
    if (!targetMember) return fail('Target member is not in this circle roster.', 404);
    circle.members.forEach((m) => {
      m.isCaptain = m.registrationId === newCaptainId;
    });
    circle.captainId = targetMember.registrationId;
    circle.captainName = targetMember.name;
    circle.updatedAt = now;
    return ok({
      message: `Captaincy successfully transferred to ${targetMember.name}.`,
      circleId,
      newCaptainId: targetMember.registrationId,
      newCaptainName: targetMember.name,
    });
  }

  if (action === 'switchCircle') {
    const { newSkillLevel, targetCircleId } = body;
    if (!newSkillLevel && !targetCircleId) {
      return fail('Choose a skill level (newSkillLevel) or a targetCircleId to switch to.', 400);
    }
    if (newSkillLevel && !SKILL_TIERS.includes(newSkillLevel)) {
      return fail(`newSkillLevel must be one of: ${SKILL_TIERS.join(', ')}.`, 400);
    }
    if (newSkillLevel && newSkillLevel === circle.skillLevel) {
      return fail('You are already in a circle at this skill level.', 400);
    }
    if (targetCircleId && targetCircleId === circleId) return fail('Attendee is already in target circle.', 400);

    const genderPref = circle.isAllWomen ? 'allWomen' : 'mixed';
    let targetCircle = null;
    let key = null;
    let groupState = null;
    if (targetCircleId) {
      targetCircle = db.circles[targetCircleId] ? structuredClone(db.circles[targetCircleId]) : null;
      if (!targetCircle) return fail(`Target circle '${targetCircleId}' not found.`, 404);
      if (targetCircle.city !== circle.city || targetCircle.venue !== circle.venue || targetCircle.eventDate !== circle.eventDate) {
        return fail('You can only switch to a circle at the same venue and night.', 400);
      }
    } else {
      key = groupKey(circle.city, circle.venue, newSkillLevel, genderPref, circle.eventDate);
      groupState = db.groupstate[key] || {};
      if (groupState.activeCircleId && db.circles[groupState.activeCircleId]) {
        targetCircle = structuredClone(db.circles[groupState.activeCircleId]);
      }
    }

    const memberIndex = circle.members.findIndex((m) => m.registrationId === registrationId);
    if (memberIndex === -1) return fail('Attendee is not currently in source circle.', 404);
    const member = circle.members[memberIndex];

    const switchHistory = [...(registration.switchHistory || [])];
    if (switchHistory.length >= SWITCH_CIRCLE_MAX_PER_NIGHT) {
      return fail(`Maximum of ${SWITCH_CIRCLE_MAX_PER_NIGHT} circle switches reached for tonight.`, 403, {
        switchesUsed: switchHistory.length,
        maxSwitches: SWITCH_CIRCLE_MAX_PER_NIGHT,
      });
    }
    const minutesSinceJoin = (now - (member.joinedAt || circle.createdAt || now)) / 60000;
    if (minutesSinceJoin < SWITCH_CIRCLE_LOCK_MINUTES) {
      const waitMinutes = Math.ceil(SWITCH_CIRCLE_LOCK_MINUTES - minutesSinceJoin);
      return fail(
        `New circle members cannot switch for the first ${SWITCH_CIRCLE_LOCK_MINUTES} minutes. Please wait ${waitMinutes} minute(s).`,
        429,
        { minutesRemaining: waitMinutes }
      );
    }
    if (switchHistory.length > 0) {
      const minutesSinceLastSwitch = (now - switchHistory[switchHistory.length - 1].timestamp) / 60000;
      if (minutesSinceLastSwitch < SWITCH_CIRCLE_COOLDOWN_MINUTES) {
        const waitMinutes = Math.ceil(SWITCH_CIRCLE_COOLDOWN_MINUTES - minutesSinceLastSwitch);
        return fail(
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
        return fail('Target circle is currently locked to new members.', 403);
      }
      if (targetCircle.totalCount >= (targetCircle.maxSpots || SOFT_MAX_GROUP)) {
        return fail('Target circle has reached capacity.', 403);
      }
      if (checkGenderCap({ male: targetCircle.maleCount, female: targetCircle.femaleCount }, member.gender, targetCircle.isAllWomen)) {
        return fail('Target circle has reached the gender balance limit for this group.', 403);
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
      groupState = { ...groupState, lastCircleCounter: index };
      createdNewCircle = true;
    }
    const finalTargetId = targetCircle.circleId;

    circle.members.splice(memberIndex, 1);
    circle.totalCount = circle.members.length;
    adjustGenderCount(circle, member.gender, -1);
    if (circle.captainId === registrationId) {
      circle.captainId = null;
      ensureCaptain(circle);
    }
    circle.updatedAt = now;

    targetCircle.members = [
      ...(targetCircle.members || []),
      { ...member, skillLevel: newSkillLevel || member.skillLevel, isCaptain: false, joinedAt: now },
    ];
    targetCircle.totalCount = targetCircle.members.length;
    adjustGenderCount(targetCircle, member.gender, 1);
    ensureCaptain(targetCircle);
    targetCircle.updatedAt = now;

    switchHistory.push({ fromCircleId: circleId, toCircleId: finalTargetId, timestamp: now });
    db.circles[finalTargetId] = { ...(db.circles[finalTargetId] || {}), ...targetCircle };
    db.registrations[registrationId] = {
      ...registration,
      circleId: finalTargetId,
      ...(newSkillLevel ? { skillLevel: newSkillLevel } : {}),
      switchHistory,
      updatedAt: now,
    };
    if (key) {
      const circleIds = groupState.circleIds || [];
      db.groupstate[key] = {
        ...groupState,
        activeCircleId: finalTargetId,
        lastCircleCounter: groupState.lastCircleCounter || 0,
        circleIds: createdNewCircle && !circleIds.includes(finalTargetId) ? [...circleIds, finalTargetId] : circleIds,
        updatedAt: now,
      };
    }
    return ok({
      message: `Switched to ${targetCircle.name}.`,
      newCircleId: finalTargetId,
      newCircle: circleSummary(targetCircle, registrationId),
      switchesRemaining: SWITCH_CIRCLE_MAX_PER_NIGHT - switchHistory.length,
    });
  }

  return fail(`Unknown circle action '${action}'.`, 400);
}

/** Copy of netlify/functions/circle/find-my-circle.js */
function handleFindMyCircle({ method, body, query, headers, db }) {
  if (method !== 'GET' && method !== 'POST') return fail('Method Not Allowed. Use GET or POST.', 405);
  const whatsapp = method === 'GET' ? query.whatsapp : body.whatsapp;

  const caller = requireAttendee(headers);
  if (caller.response) return caller.response;
  const phone = caller.phone;
  if (whatsapp && normalizePhone(whatsapp) !== phone) {
    return fail('Verify this WhatsApp number with OTP to see its circles.', 401, { sessionRequired: true });
  }

  const todayDateString = getIstTime().dateString;
  const registrations = Object.values(db.registrations)
    .filter((r) => r.whatsapp === phone)
    .sort((a, b) => {
      const timeA = a.createdAt || (a.eventDate ? new Date(a.eventDate).getTime() : 0);
      const timeB = b.createdAt || (b.eventDate ? new Date(b.eventDate).getTime() : 0);
      return timeB - timeA;
    })
    .map((reg) => {
      const eventDate = reg.eventDate || todayDateString;
      const circleDetails = reg.circleId ? getCurrentCircle(db, reg.circleId) : null;
      const registrationId = reg.id || reg.registrationId;
      const circleId = circleDetails?.circleId || reg.circleId || null;
      let accessTier = 'past';
      let hasBeaconAccess = false;
      let statusMessage = 'Past event night. Raas over, circle closed. View-only pass archived.';
      if (eventDate === todayDateString) {
        accessTier = 'live';
        hasBeaconAccess = Boolean(circleId);
        statusMessage = circleId
          ? 'Active circle for tonight. Beacon enabled.'
          : 'Registered for tonight. Your circle appears here once payment is confirmed.';
      } else if (eventDate > todayDateString) {
        accessTier = 'upcoming';
        statusMessage = circleId
          ? 'Circle assigned. The beacon unlocks on event night.'
          : 'Advance registration confirmed. Circle assignment occurs 48 hours prior to event.';
      }
      return {
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
        meetingPoint: hasBeaconAccess ? circleDetails?.meetingPoint || null : null,
        chatLink: null,
        qrPassToken: `pass_${registrationId}`,
        accessTier,
        hasBeaconAccess,
        hasChatAccess: false,
        statusMessage,
        paymentStatus: reg.paymentStatus || 'pending',
        createdAt: reg.createdAt,
      };
    });

  return ok({ whatsapp: phone, todayDate: todayDateString, totalEntries: registrations.length, registrations });
}

/** Copy of netlify/functions/circle/get-circle.js */
function handleGetCircle({ method, body, query, headers, db }) {
  if (method !== 'GET' && method !== 'POST') return fail('Method Not Allowed. Use GET or POST.', 405);
  const circleId = method === 'GET' ? query.circleId : body.circleId;
  const caller = requireAttendee(headers);
  if (caller.response) return caller.response;
  if (!circleId) return fail("Missing required parameter 'circleId'.", 400);

  const circle = getCurrentCircle(db, circleId);
  if (!circle) return fail('Circle not found.', 404);
  const mine = Object.values(db.registrations).find((r) => r.whatsapp === caller.phone && r.circleId === circle.circleId);
  if (!mine) return fail('You are not a member of this circle.', 403);
  return ok({
    circle: circleSummary(circle, mine.id),
    registrationId: mine.id,
    redirectedFrom: circle.circleId !== circleId ? circleId : null,
  });
}

/** Copy of netlify/functions/organizer/admin-auth.js (no master login in demo mode). */
function handleAdminAuth({ method, body, db }) {
  if (method !== 'POST') return fail('Method Not Allowed. Use POST.', 405);
  const { venueId, password } = body;
  if (!venueId || typeof venueId !== 'string') return fail('Missing required parameter: venueId.', 400);
  if (!password || typeof password !== 'string') return fail('Missing required parameter: password.', 400);
  const cleanVenueId = venueId.trim().toUpperCase();
  const account = db.organizers[cleanVenueId];
  if (!account || account.disabled || account.passwordHash !== sha256Hex(`${account.salt}:${password.trim()}`)) {
    return fail('Invalid Venue ID or Password.', 401);
  }
  return ok({
    message: 'Organizer authentication successful.',
    venueId: cleanVenueId,
    city: account.city,
    venue: account.venue,
    token: createOrganizerToken({ venueId: cleanVenueId, city: account.city, venue: account.venue }),
    expiresInHours: ORGANIZER_SESSION_TTL_HOURS,
  });
}

/** Copy of netlify/functions/organizer/organizer-stats.js */
function handleOrganizerStats({ method, body, query, headers, db }) {
  if (method !== 'GET' && method !== 'POST') return fail('Method Not Allowed. Use GET or POST.', 405);
  const token = String(headers.authorization || headers['x-organizer-token'] || '').replace(/^Bearer\s+/i, '').trim();
  const session = verifyOrganizerToken(token);
  if (!session.valid) return fail(session.error || 'Unauthorized: Valid organizer session token required.', 401);

  const params = method === 'GET' ? query : body;
  const eventDate = String(params.eventDate || getIstTime().dateString).trim();
  const city = String(session.city || '').trim();
  const venue = String(session.venue || '').trim();
  if (!city || !venue) {
    return fail('This organizer account has no venue assigned. Ask festival operations to set it up.', 400);
  }

  const totalShowups = (db.showups[compositeKey(city, venue, eventDate)]?.showupsArray || []).length;
  let liveCount = 0;
  let advanceCount = 0;
  const skillCounts = { beginner: 0, intermediate: 0, advanced: 0 };
  const genderCounts = { male: 0, female: 0, prefer_not_to_say: 0 };
  let allWomenCirclesCount = 0;
  let needsAttentionCount = 0;
  const countPerson = (person) => {
    skillCounts[SKILL_TIERS.includes(person.skillLevel) ? person.skillLevel : 'intermediate'] += 1;
    if (person.gender === 'male') genderCounts.male += 1;
    else if (person.gender === 'female') genderCounts.female += 1;
    else genderCounts.prefer_not_to_say += 1;
  };

  const seen = new Set();
  const circlesList = [];
  for (const level of SKILL_TIERS) {
    for (const pref of GENDER_PREFS) {
      const key = groupKey(city, venue, level, pref, eventDate);
      const groupState = db.groupstate[key];
      const circleIds = groupState?.circleIds || (groupState?.activeCircleId ? [groupState.activeCircleId] : []);
      for (const circleId of circleIds) {
        if (seen.has(circleId)) continue;
        seen.add(circleId);
        const circle = db.circles[circleId];
        if (!circle || circle.status === 'merged') continue;
        circlesList.push(circle);
        if (circle.isAllWomen) allWomenCirclesCount += 1;
        if (circle.needsOrganizerAttention) needsAttentionCount += 1;
        for (const member of circle.members || []) {
          if (circle.origin === 'advance') advanceCount += 1;
          else liveCount += 1;
          countPerson(member);
        }
      }
      for (const person of db.pools[key]?.poolArray || []) {
        advanceCount += 1;
        countPerson(person);
      }
    }
  }

  const totalRegistrations = liveCount + advanceCount;
  const withMembers = circlesList.filter((c) => (c.members || []).length > 0);
  const totalMembers = withMembers.reduce((acc, c) => acc + c.members.length, 0);
  return ok({
    venue,
    city,
    eventDate,
    registrations: { total: totalRegistrations, live: liveCount, advance: advanceCount },
    skillLevelBreakdown: skillCounts,
    genderBalance: genderCounts,
    circles: {
      totalFormed: withMembers.length,
      averageSize: withMembers.length > 0 ? Number((totalMembers / withMembers.length).toFixed(1)) : 0,
      allWomenCircleCount: allWomenCirclesCount,
      needsAttention: needsAttentionCount,
    },
    attendance: {
      totalShowups,
      showUpRatePercentage: totalRegistrations > 0 ? Number(((totalShowups / totalRegistrations) * 100).toFixed(1)) : 0,
    },
    dataFreshnessTimestamp: Date.now(),
  });
}

/** Copy of netlify/functions/circle/finalize-bucket.js (admin secret: MOCK_ADMIN_SECRET). */
function handleFinalizeBucket({ method, body, headers, db }) {
  if (method !== 'POST') return fail('Method Not Allowed. Use POST.', 405);
  const headerSecret = headers['x-admin-secret'] || (headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (headerSecret !== MOCK_ADMIN_SECRET && body.adminSecret !== MOCK_ADMIN_SECRET) {
    return fail('Unauthorized: Invalid or missing ADMIN_SECRET.', 401);
  }
  const { city, venue, level, genderPref, eventDate } = body;
  if (!city || !venue || !level || !genderPref || !eventDate) {
    return fail('Missing required partition parameters: city, venue, level, genderPref, eventDate.', 400);
  }
  const now = Date.now();
  const formed = formCirclesFromPool(db, { city, venue, level, genderPref, eventDate }, now);
  const merged = body.mergeSmallCircles ? mergeSmallCirclesForNight(db, { city, venue, eventDate }, now) : null;
  if (formed.placed === 0 && !merged) return fail('Pending pool is empty for this partition.', 404);
  return ok({
    circleIds: formed.circleIds,
    placed: formed.placed,
    merges: merged ? merged.moves : [],
    flaggedCircles: merged ? merged.flagged : [],
  });
}

// Keys are the Netlify Function names (the shim filenames in netlify/functions/)
const HANDLERS = {
  'send-otp': handleSendOtp,
  'verify-otp': handleVerifyOtp,
  'verify-ticket': handleVerifyTicket,
  register: handleRegister,
  'advance-register': handleAdvanceRegister,
  'create-order': handleCreateOrder,
  'verify-payment': handleVerifyPayment,
  'circle-actions': handleCircleActions,
  'find-my-circle': handleFindMyCircle,
  'get-circle': handleGetCircle,
  'admin-auth': handleAdminAuth,
  'organizer-stats': handleOrganizerStats,
  'finalize-bucket': handleFinalizeBucket,
};

/**
 * Drop-in replacement for fetch() used by apiClient for demo requests. Returns a real Response
 * so apiClient's normal envelope parsing and ApiError handling run unchanged.
 */
export async function mockFetch(url, config = {}) {
  installMockEnvironment();
  const parsedUrl = new URL(url, window.location.origin);
  const functionName = parsedUrl.pathname.split('/').filter(Boolean).pop();
  const method = String(config.method || 'GET').toUpperCase();
  const headers = {};
  Object.entries(config.headers || {}).forEach(([key, value]) => {
    headers[key.toLowerCase()] = value;
  });

  await sleep(mockOptions.latencyMs);

  const handler = HANDLERS[functionName];
  if (!handler) {
    return new Response(`Function not found: ${functionName}`, { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }

  let body = {};
  if (typeof config.body === 'string' && config.body) {
    try {
      body = JSON.parse(config.body);
    } catch {
      return fail('Invalid JSON body in request payload.', 400);
    }
  }

  const db = loadDb();
  try {
    runScheduledJobs(db);
    const response = await handler({ method, body, query: Object.fromEntries(parsedUrl.searchParams.entries()), headers, db });
    saveDb();
    return response;
  } catch (error) {
    console.error(`[demo ${functionName}]`, error);
    return fail(error.message || 'Internal server error.', 500);
  }
}

// ---------------------------------------------------------------------------
// Fake Razorpay checkout (PaymentStep opens it for orders with the demo key)
// ---------------------------------------------------------------------------
function createElement(tag, style, text) {
  const element = document.createElement(tag);
  Object.assign(element.style, style);
  if (text) element.textContent = text;
  return element;
}

/** Mirrors the webhook's payment.failed handling, which the fake checkout can't trigger. */
function markOrderFailed(orderId, reason) {
  const db = loadDb();
  const registration = Object.values(db.registrations).find((r) => r.orderId === orderId);
  if (registration && registration.paymentStatus !== 'confirmed') {
    db.registrations[registration.id] = { ...registration, paymentStatus: 'failed', paymentFailureReason: reason, failedAt: Date.now() };
    saveDb();
  }
}

/** Implements the parts of window.Razorpay that PaymentStep uses: new Checkout(options), .on(), .open(). */
export class MockRazorpayCheckout {
  constructor(options) {
    this.options = options || {};
    this.failureHandlers = [];
  }

  on(event, handler) {
    if (event === 'payment.failed') this.failureHandlers.push(handler);
  }

  open() {
    const { amount = 0, order_id: orderId, description, handler, modal } = this.options;
    const overlay = createElement('div', {
      position: 'fixed',
      inset: '0',
      zIndex: '10001',
      background: 'rgba(10, 8, 20, 0.72)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'Manrope, sans-serif',
    });
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Mock Razorpay checkout');

    const card = createElement('div', {
      width: '100%',
      maxWidth: '360px',
      background: '#FFFFFF',
      color: '#1B1730',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
    });
    card.appendChild(
      createElement('div', { fontSize: '12px', fontWeight: '700', color: '#7C3AED', letterSpacing: '0.5px' }, 'MOCK RAZORPAY · TEST MODE')
    );
    card.appendChild(createElement('div', { fontSize: '28px', fontWeight: '700', margin: '6px 0 2px' }, `₹${(amount / 100).toFixed(0)}`));
    card.appendChild(createElement('div', { fontSize: '13px', color: '#4B4563' }, description || 'SoloSaathi Circle Pass'));
    card.appendChild(
      createElement('div', { fontSize: '11px', color: '#6E6590', margin: '4px 0 16px', wordBreak: 'break-all' }, `Order ${orderId} · no money moves`)
    );

    const close = () => overlay.remove();
    const addButton = (label, variant, onClick) => {
      const primary = variant === 'primary';
      const button = createElement(
        'button',
        {
          display: 'block',
          width: '100%',
          minHeight: '44px',
          marginTop: '8px',
          borderRadius: '10px',
          border: primary ? 'none' : '1px solid #D9D3E8',
          background: primary ? '#16A34A' : '#FFFFFF',
          color: primary ? '#FFFFFF' : variant === 'danger' ? '#BE123C' : '#1B1730',
          font: '600 14px Manrope, sans-serif',
          cursor: 'pointer',
        },
        label
      );
      button.type = 'button';
      button.addEventListener('click', onClick);
      card.appendChild(button);
    };

    addButton('Pay successfully', 'primary', () => {
      close();
      const paymentId = `pay_mock_${randomHex(7)}`;
      handler?.({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: mockPaymentSignature(orderId, paymentId),
      });
    });
    addButton('Payment fails', 'danger', () => {
      close();
      markOrderFailed(orderId, 'Mock payment declined by the bank');
      this.failureHandlers.forEach((fn) =>
        fn({
          error: {
            code: 'BAD_REQUEST_ERROR',
            description: 'Mock payment declined by the bank.',
            reason: 'payment_failed',
            metadata: { order_id: orderId },
          },
        })
      );
    });
    addButton('Pay with a tampered signature', 'danger', () => {
      close();
      handler?.({
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_mock_${randomHex(7)}`,
        razorpay_signature: 'tampered_signature',
      });
    });
    addButton('Close checkout', 'secondary', () => {
      close();
      modal?.ondismiss?.();
    });

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }
}

let environmentInstalled = false;

/** Installs the console helpers. Safe to call repeatedly. */
export function installMockEnvironment() {
  if (environmentInstalled || typeof window === 'undefined') return;
  environmentInstalled = true;

  window.solosaathiMock = {
    options: mockOptions,
    reset: resetMockData,
    finalizeAdvance,
    mergeSmallCircles,
    get db() {
      return loadDb();
    },
  };

  console.info(
    '[SoloSaathi] Demo backend answering test details (90000 00xxx, OTP 123456; organizer DEMO-UNIT / demo1234). ' +
      'Helpers: window.solosaathiMock (reset, finalizeAdvance, mergeSmallCircles, options, db).'
  );
}
