/**
 * Contract tests for the in-browser demo backend (frontend/src/api/mockApi.js) and its routing
 * (frontend/src/api/mockMode.js). The demo backend must follow the same rules as the Netlify
 * Functions; these tests walk the flows a tester would use on the deployed site.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Minimal browser globals for the demo backend
class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: new MemoryStorage(), configurable: true });
globalThis.window = { location: { origin: 'http://localhost:5173' } };
console.info = () => {};
console.table = () => {};

const mock = await import('../frontend/src/api/mockApi.js');
const mode = await import('../frontend/src/api/mockMode.js');
mock.mockOptions.latencyMs = 0;

const OTP = '123456';
const DEMO_PHONE = '9000000000';

async function call(fn, body, { token, method = 'POST', query } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  const res = await mock.mockFetch(`http://localhost:8888/.netlify/functions/${fn}${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
  });
  return { status: res.status, ...(await res.json()) };
}

async function signIn(phone) {
  assert.equal((await call('send-otp', { whatsapp: phone })).success, true);
  const verified = await call('verify-otp', { whatsapp: phone, code: OTP });
  assert.equal(verified.success, true, verified.error);
  return verified.data.sessionToken;
}

const signature = (orderId, paymentId) =>
  createHash('sha256').update(`${orderId}|${paymentId}|mock_razorpay_key_secret`).digest('hex');

async function pay(registrationId) {
  const order = await call('create-order', { registrationId });
  assert.equal(order.success, true, order.error);
  const paymentId = `pay_test_${Math.random().toString(16).slice(2)}`;
  return call('verify-payment', {
    registrationId,
    razorpay_order_id: order.data.orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature(order.data.orderId, paymentId),
  });
}

const registration = (phone, fields = {}) => ({
  name: `Tester ${phone.slice(-3)}`,
  whatsapp: phone,
  city: 'Ahmedabad',
  venue: 'Rajpath Club',
  gender: 'female',
  ageBand: '18-24',
  skillLevel: 'intermediate',
  allWomenToggle: false,
  captainOptIn: false,
  ticketSerial: 'TEST-1',
  ...fields,
});

function istDate(offsetDays) {
  const ist = new Date(Date.now() + 5.5 * 3600000 + offsetDays * 86400000);
  return ist.toISOString().slice(0, 10);
}

test('routing: test numbers, demo IDs, demo tokens and DEMO- venues go to the demo backend', () => {
  assert.equal(mode.isTestPhone('9000000000'), true);
  assert.equal(mode.isTestPhone('+91 90000 00999'), true);
  assert.equal(mode.isTestPhone('9000001000'), false);
  assert.equal(mode.isTestPhone('9876543210'), false);
  assert.equal(mode.shouldUseMock('send-otp', { whatsapp: '9000000123' }), true);
  assert.equal(mode.shouldUseMock('send-otp', { whatsapp: '9876543210' }), false);
  assert.equal(mode.shouldUseMock('create-order', { registrationId: 'reg_live_mock_1_ab' }), true);
  assert.equal(mode.shouldUseMock('create-order', { registrationId: 'reg_live_1_ab' }), false);
  assert.equal(mode.shouldUseMock('admin-auth', { venueId: 'demo-unit' }), true);
  assert.equal(mode.shouldUseMock('admin-auth', { venueId: 'AH-UNIT' }), false);
  assert.equal(mode.isMockOrder({ keyId: 'rzp_test_mock' }), true);
});

test('OTP: 123456 works, 5 wrong codes lock the number for 15 minutes', async () => {
  mock.installMockEnvironment();
  window.solosaathiMock.reset();
  const phone = '9000000500';
  await call('send-otp', { whatsapp: phone });
  for (let i = 1; i <= 4; i++) {
    const res = await call('verify-otp', { whatsapp: phone, code: '000000' });
    assert.equal(res.details.attemptsRemaining, 5 - i);
  }
  const locked = await call('verify-otp', { whatsapp: phone, code: '000000' });
  assert.equal(locked.status, 403);
  assert.equal(locked.details.hardBlocked, true);
  const resend = await call('send-otp', { whatsapp: phone });
  assert.equal(resend.status, 429);
  assert.equal(resend.details.lockoutMinutesRemaining, 15);

  const token = await signIn('9000000501');
  const payload = mode.readTokenPayload(token);
  assert.equal(payload.mock, true);
  assert.equal(payload.phone, '9000000501');
  assert.equal(mode.shouldUseMock('circle-actions', {}, {}, { Authorization: `Bearer ${token}` }), true);
});

test('live signup: register, failed and tampered payments, then pay and land in a circle', async () => {
  window.solosaathiMock.reset();
  const phone = '9000000011';
  const token = await signIn(phone);

  const reg = await call('register', registration(phone, { captainOptIn: true }));
  assert.equal(reg.status, 201, reg.error);
  const { registrationId } = reg.data;
  assert.match(registrationId, /^reg_live_mock_\d+_[0-9a-f]{12}$/);
  assert.ok(!registrationId.includes(phone), 'no phone numbers in IDs');

  const order = await call('create-order', { registrationId });
  assert.equal(order.data.keyId, mode.MOCK_RAZORPAY_KEY_ID);
  const tampered = await call('verify-payment', {
    registrationId,
    razorpay_order_id: order.data.orderId,
    razorpay_payment_id: 'pay_x',
    razorpay_signature: 'tampered_signature',
  });
  assert.equal(tampered.status, 400);

  const paid = await pay(registrationId);
  assert.equal(paid.success, true, paid.error);
  const circle = paid.data.matching.circle;
  assert.match(circle.circleId, /^TAAL-01_ahmedabad_rajpath_club_/);
  assert.equal(circle.isCaptain, true);
  assert.equal(circle.members[0].whatsapp, undefined);

  // The circle page reloads through get-circle
  const loaded = await call('get-circle', null, { method: 'GET', query: { circleId: circle.circleId }, token });
  assert.equal(loaded.data.registrationId, registrationId);
  assert.equal((await call('get-circle', null, { method: 'GET', query: { circleId: circle.circleId } })).status, 401);

  const showup = await call('circle-actions', { action: 'showup', registrationId }, { token });
  assert.equal(showup.data.totalShowups, 1);
  const grow = await call('circle-actions', { action: 'grow', registrationId, circleId: circle.circleId, spots: 4 }, { token });
  assert.equal(grow.data.maxSpots, 28);
});

test('demo account 9000000000: live, upcoming and past bookings; member tools and switch by level', async () => {
  window.solosaathiMock.reset();
  assert.equal((await call('find-my-circle', { whatsapp: DEMO_PHONE })).status, 401);
  const token = await signIn(DEMO_PHONE);
  const found = await call('find-my-circle', { whatsapp: DEMO_PHONE }, { token });
  assert.deepEqual(found.data.registrations.map((r) => r.accessTier).sort(), ['live', 'past', 'upcoming']);
  const live = found.data.registrations.find((r) => r.accessTier === 'live');
  assert.equal(live.hasBeaconAccess, true);
  assert.equal(live.hasChatAccess, false);

  const lock = await call('circle-actions', { action: 'lock', registrationId: live.registrationId }, { token });
  assert.equal(lock.status, 403, 'only the captain (Aarav) can lock');

  const otherToken = await signIn('9000000777');
  const notMine = await call('circle-actions', { action: 'leave', registrationId: live.registrationId }, { token: otherToken });
  assert.equal(notMine.status, 403);

  const switched = await call(
    'circle-actions',
    { action: 'switchCircle', registrationId: live.registrationId, newSkillLevel: 'advanced' },
    { token }
  );
  assert.equal(switched.success, true, switched.error);
  assert.match(switched.data.newCircleId, /^RAAS-01_/);
  assert.equal(switched.data.newCircle.members.length, 1);
});

test('organizer DEMO-UNIT / demo1234 sees non-zero numbers for tonight', async () => {
  window.solosaathiMock.reset();
  assert.equal((await call('admin-auth', { venueId: 'DEMO-UNIT', password: 'nope' })).status, 401);
  const login = await call('admin-auth', { venueId: 'demo-unit', password: 'demo1234' });
  assert.equal(login.success, true);
  assert.equal(mode.readTokenPayload(login.data.token).mock, true);

  const stats = await call('organizer-stats', null, {
    method: 'GET',
    query: { eventDate: istDate(0) },
    token: login.data.token,
  });
  assert.equal(stats.data.venue, 'United Way Garba Grounds');
  assert.equal(stats.data.registrations.live, 5);
  assert.equal(stats.data.circles.totalFormed, 1);
  assert.equal(stats.data.attendance.totalShowups, 2);
});

test('advance: 3 beginners + 7 intermediates form two circles, then merge into one of 10', async () => {
  window.solosaathiMock.reset();
  const eventDate = istDate(20);
  const book = async (phone, skillLevel, gender) => {
    const token = await signIn(phone);
    const reg = await call('advance-register', {
      ...registration(phone, { skillLevel, gender, venue: 'GMDC Ground', ticketPhoto: 'data:image/png;base64,AAAA' }),
      eventDate,
    });
    assert.equal(reg.status, 201, reg.error);
    const paid = await pay(reg.data.registrationId);
    assert.equal(paid.data.matching.type, 'advance');
    return { token, registrationId: reg.data.registrationId };
  };

  const beginners = [];
  for (let i = 0; i < 3; i++) beginners.push(await book(`900000030${i}`, 'beginner', 'female'));
  for (let i = 0; i < 7; i++) await book(`900000031${i}`, 'intermediate', i % 2 ? 'male' : 'female');

  window.solosaathiMock.finalizeAdvance();
  const db = window.solosaathiMock.db;
  const gmdc = Object.values(db.circles).filter((c) => c.venue === 'GMDC Ground' && c.eventDate === eventDate);
  assert.deepEqual(gmdc.map((c) => c.members.length).sort(), [3, 7]);
  const oldCircleId = gmdc.find((c) => c.skillLevel === 'beginner').circleId;

  window.solosaathiMock.mergeSmallCircles();
  const after = window.solosaathiMock.db;
  const active = Object.values(after.circles).filter(
    (c) => c.venue === 'GMDC Ground' && c.eventDate === eventDate && c.status === 'active'
  );
  assert.equal(active.length, 1);
  assert.equal(active[0].members.length, 10);

  const { token } = beginners[0];
  const viaOldLink = await call('get-circle', null, { method: 'GET', query: { circleId: oldCircleId }, token });
  assert.equal(viaOldLink.data.circle.circleId, active[0].circleId);
  assert.equal(viaOldLink.data.redirectedFrom, oldCircleId);
  const found = await call('find-my-circle', { whatsapp: '9000000300' }, { token });
  assert.equal(found.data.registrations[0].circleId, active[0].circleId);
});

test('the scheduled job forms circles for a booking within 48 hours on the next request', async () => {
  window.solosaathiMock.reset();
  const phone = '9000000400';
  const token = await signIn(phone);
  const reg = await call('advance-register', {
    ...registration(phone, { ticketPhoto: 'data:image/png;base64,AAAA' }),
    eventDate: istDate(1),
  });
  assert.equal(reg.status, 201, reg.error);
  await pay(reg.data.registrationId);
  const found = await call('find-my-circle', { whatsapp: phone }, { token });
  assert.ok(found.data.registrations[0].circleId, 'placed in a circle by the 48-hour step');
});
