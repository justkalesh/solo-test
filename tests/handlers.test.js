/**
 * Backend handler tests against an in-memory db (tests/helpers/fake-db.js).
 */
require('./helpers/setup-env');
const test = require('node:test');
const assert = require('node:assert/strict');
const { installFakeDb } = require('./helpers/fake-db');

const CITY = 'Ahmedabad';
const VENUE = 'United Way Garba Grounds';
const DATE = '2026-10-17';

function load() {
  const fake = installFakeDb();
  return {
    fake,
    session: require('../netlify/shared/session'),
    advance: require('../netlify/shared/advance-circles'),
    payments: require('../netlify/shared/payment-helpers'),
    circleActions: require('../netlify/functions/circle/circle-actions').handler,
    findMyCircle: require('../netlify/functions/circle/find-my-circle').handler,
    getCircle: require('../netlify/functions/circle/get-circle').handler,
    adminAuth: require('../netlify/functions/organizer/admin-auth'),
    organizerStats: require('../netlify/functions/organizer/organizer-stats').handler,
    accounts: require('../netlify/shared/organizer-accounts'),
  };
}

const post = (body, token) => ({
  httpMethod: 'POST',
  headers: token ? { authorization: `Bearer ${token}` } : {},
  body: JSON.stringify(body),
});
const get = (query, token) => ({
  httpMethod: 'GET',
  headers: token ? { authorization: `Bearer ${token}` } : {},
  queryStringParameters: query,
});
const parse = (res) => ({ status: res.statusCode, ...JSON.parse(res.body) });

let counter = 0;
function addRegistration(fake, fields) {
  counter += 1;
  const id = `reg_test_${counter}`;
  fake.store.registrations[id] = {
    id,
    name: `Dancer ${counter}`,
    whatsapp: `90000001${String(counter).padStart(2, '0')}`,
    city: CITY,
    venue: VENUE,
    gender: 'female',
    ageBand: '25-34',
    skillLevel: 'intermediate',
    allWomenToggle: false,
    captainOptIn: false,
    registrationType: 'live',
    eventDate: DATE,
    paymentStatus: 'confirmed',
    circleId: null,
    createdAt: Date.now(),
    ...fields,
  };
  return fake.store.registrations[id];
}

async function joinLive(ctx, fields = {}) {
  const reg = addRegistration(ctx.fake, fields);
  const result = await ctx.payments.joinMatchingBucket(reg);
  return { reg: ctx.fake.store.registrations[reg.id], circleId: result.circleId };
}

test('attendee session tokens: valid, tampered, expired', () => {
  const { session } = load();
  const token = session.createAttendeeToken('9000000001');
  assert.deepEqual(session.verifyAttendeeToken(token), { valid: true, phone: '9000000001' });
  const [payload] = token.split('.');
  assert.equal(session.verifyAttendeeToken(`${payload}.${'0'.repeat(64)}`).valid, false);
  const old = session.createAttendeeToken('9000000001', Date.now() - 13 * 3600000);
  assert.equal(session.verifyAttendeeToken(old).valid, false);
});

test('live matching gives unique circle IDs per venue and records every circle for stats', async () => {
  const ctx = load();
  const a = await joinLive(ctx);
  const b = await joinLive(ctx, { venue: 'GMDC Ground' });
  assert.notEqual(a.circleId, b.circleId);
  const circle = ctx.fake.store.circles[a.circleId];
  assert.equal(circle.members[0].whatsapp, undefined, 'no phone numbers in circles');
  const gs = await ctx.fake.getGroupState(CITY, VENUE, 'intermediate', 'mixed', DATE);
  assert.deepEqual(gs.circleIds, [a.circleId]);
});

test("circle-actions requires the session and the caller's own registration", async () => {
  const ctx = load();
  const me = await joinLive(ctx, { captainOptIn: true });
  const other = await joinLive(ctx);

  let res = parse(await ctx.circleActions(post({ action: 'lock', registrationId: me.reg.id })));
  assert.equal(res.status, 401);
  assert.equal(res.details.sessionRequired, true);

  const otherToken = ctx.session.createAttendeeToken(other.reg.whatsapp);
  res = parse(await ctx.circleActions(post({ action: 'lock', registrationId: me.reg.id }, otherToken)));
  assert.equal(res.status, 403);

  res = parse(await ctx.circleActions(post({ action: 'lock', registrationId: other.reg.id }, otherToken)));
  assert.equal(res.status, 403, 'members who are not captain cannot lock');

  const myToken = ctx.session.createAttendeeToken(me.reg.whatsapp);
  res = parse(await ctx.circleActions(post({ action: 'lock', registrationId: me.reg.id }, myToken)));
  assert.equal(res.success, true);
  assert.equal(ctx.fake.store.circles[me.circleId].isLocked, true);

  res = parse(
    await ctx.circleActions(
      post({ action: 'transferCaptain', registrationId: me.reg.id, newCaptainId: other.reg.id }, myToken)
    )
  );
  assert.equal(res.success, true);
  assert.equal(ctx.fake.store.circles[me.circleId].captainId, other.reg.id);
});

test("showup uses the registration's venue and night", async () => {
  const ctx = load();
  const me = await joinLive(ctx);
  const token = ctx.session.createAttendeeToken(me.reg.whatsapp);
  const res = parse(await ctx.circleActions(post({ action: 'showup', registrationId: me.reg.id }, token)));
  assert.equal(res.success, true);
  assert.equal((await ctx.fake.getShowups(CITY, VENUE, DATE)).length, 1);
});

test("switchCircle by skill level creates or joins the level's circle and returns it", async () => {
  const ctx = load();
  const me = await joinLive(ctx);
  ctx.fake.store.circles[me.circleId].members[0].joinedAt = Date.now() - 10 * 60000;
  const token = ctx.session.createAttendeeToken(me.reg.whatsapp);

  const res = parse(
    await ctx.circleActions(post({ action: 'switchCircle', registrationId: me.reg.id, newSkillLevel: 'advanced' }, token))
  );
  assert.equal(res.success, true, res.error);
  assert.match(res.data.newCircleId, /^RAAS-01_/);
  assert.equal(res.data.newCircle.members.length, 1);
  assert.equal(ctx.fake.store.registrations[me.reg.id].circleId, res.data.newCircleId);
  assert.equal(ctx.fake.store.registrations[me.reg.id].skillLevel, 'advanced');
  assert.equal(ctx.fake.store.circles[me.circleId].members.length, 0);

  const again = parse(
    await ctx.circleActions(post({ action: 'switchCircle', registrationId: me.reg.id, newSkillLevel: 'beginner' }, token))
  );
  assert.equal(again.status, 429, 'new members wait 5 minutes before switching again');
});

test('advance stage 1 forms circles from any pool size; stage 2 merges 3 beginners into 7 intermediates', async () => {
  const ctx = load();
  const addToPool = async (level, n) => {
    for (let i = 0; i < n; i++) {
      const reg = addRegistration(ctx.fake, {
        registrationType: 'advance',
        skillLevel: level,
        gender: i % 2 ? 'male' : 'female',
      });
      await ctx.payments.joinMatchingBucket(reg);
    }
  };
  await addToPool('beginner', 3);
  await addToPool('intermediate', 7);

  const partition = { city: CITY, venue: VENUE, genderPref: 'mixed', eventDate: DATE };
  const b = await ctx.advance.formCirclesFromPool({ ...partition, level: 'beginner' });
  const i = await ctx.advance.formCirclesFromPool({ ...partition, level: 'intermediate' });
  assert.equal(b.placed, 3);
  assert.equal(i.placed, 7);

  const merged = await ctx.advance.mergeSmallCircles({ city: CITY, venue: VENUE, eventDate: DATE });
  assert.deepEqual(merged.moves, [{ from: b.circleIds[0], to: i.circleIds[0] }]);
  assert.equal(ctx.fake.store.circles[i.circleIds[0]].members.length, 10);
  assert.equal(ctx.fake.store.circles[b.circleIds[0]].status, 'merged');

  // Moved attendees find their new circle through the old link and in Find My Circle
  const moved = Object.values(ctx.fake.store.registrations).find((r) => r.skillLevel === 'beginner');
  assert.equal(moved.circleId, i.circleIds[0]);
  const token = ctx.session.createAttendeeToken(moved.whatsapp);
  const viaOldLink = parse(await ctx.getCircle(get({ circleId: b.circleIds[0] }, token)));
  assert.equal(viaOldLink.data.circle.circleId, i.circleIds[0]);
  assert.equal(viaOldLink.data.redirectedFrom, b.circleIds[0]);
  const found = parse(await ctx.findMyCircle(post({}, token)));
  assert.equal(found.data.registrations[0].circleId, i.circleIds[0]);

  // Running the merge again changes nothing
  const again = await ctx.advance.mergeSmallCircles({ city: CITY, venue: VENUE, eventDate: DATE });
  assert.deepEqual(again.moves, []);
});

test('live circles are never merged; a lone dancer is flagged for the organizer', async () => {
  const ctx = load();
  await joinLive(ctx, { skillLevel: 'advanced' });
  const reg = addRegistration(ctx.fake, { registrationType: 'advance', skillLevel: 'intermediate' });
  await ctx.payments.joinMatchingBucket(reg);
  const formed = await ctx.advance.formCirclesFromPool({
    city: CITY,
    venue: VENUE,
    level: 'intermediate',
    genderPref: 'mixed',
    eventDate: DATE,
  });
  const result = await ctx.advance.mergeSmallCircles({ city: CITY, venue: VENUE, eventDate: DATE });
  assert.deepEqual(result.moves, []);
  assert.deepEqual(result.flagged, formed.circleIds);
  assert.equal(ctx.fake.store.circles[formed.circleIds[0]].needsOrganizerAttention, true);
});

test('find-my-circle and get-circle need the session; get-circle is members only', async () => {
  const ctx = load();
  const me = await joinLive(ctx);
  const stranger = addRegistration(ctx.fake, {});

  assert.equal(parse(await ctx.findMyCircle(post({ whatsapp: me.reg.whatsapp }))).status, 401);
  const myToken = ctx.session.createAttendeeToken(me.reg.whatsapp);
  assert.equal(parse(await ctx.findMyCircle(post({ whatsapp: stranger.whatsapp }, myToken))).status, 401);

  const mine = parse(await ctx.findMyCircle(post({ whatsapp: me.reg.whatsapp }, myToken)));
  assert.equal(mine.data.registrations.length, 1);
  assert.equal(mine.data.registrations[0].chatLink, null, 'chat is hidden for launch');

  const strangerToken = ctx.session.createAttendeeToken(stranger.whatsapp);
  assert.equal(parse(await ctx.getCircle(get({ circleId: me.circleId }, strangerToken))).status, 403);
  const ok = parse(await ctx.getCircle(get({ circleId: me.circleId }, myToken)));
  assert.equal(ok.data.registrationId, me.reg.id);
});

test('organizer accounts: hashed passwords, venue from the token, master login off by default', async () => {
  const ctx = load();
  await ctx.fake.saveOrganizer('AH-UNIT', {
    city: CITY,
    venue: VENUE,
    ...ctx.accounts.createPasswordRecord('s3cret-pass'),
    disabled: false,
  });
  await joinLive(ctx);
  await joinLive(ctx);

  assert.equal(parse(await ctx.adminAuth.handler(post({ venueId: 'ah-unit', password: 'wrong' }))).status, 401);
  assert.equal(
    parse(await ctx.adminAuth.handler(post({ venueId: 'AH-UNIT', password: process.env.ADMIN_SECRET }))).status,
    401,
    'ADMIN_SECRET does not log in unless ALLOW_MASTER_ADMIN_LOGIN=true'
  );
  const login = parse(await ctx.adminAuth.handler(post({ venueId: 'ah-unit', password: 's3cret-pass' })));
  assert.equal(login.success, true);
  assert.equal(login.data.venue, VENUE);

  const stats = parse(
    await ctx.organizerStats({
      httpMethod: 'GET',
      headers: { authorization: `Bearer ${login.data.token}` },
      queryStringParameters: { eventDate: DATE, venue: 'Somewhere Else' },
    })
  );
  assert.equal(stats.data.venue, VENUE, 'organizers cannot pick another venue');
  assert.equal(stats.data.registrations.live, 2);
  assert.equal(stats.data.circles.totalFormed, 1);
});

test('auto-finalize merges small circles from 12 hours before the start, not earlier', async (t) => {
  const ctx = load();
  const autoFinalize = require('../netlify/functions/scheduled/auto-finalize').handler;
  const { getEventStartUtcMs } = require('../netlify/shared/matching');
  ctx.fake.store.config.venues = { [CITY]: [VENUE] };

  for (const [level, n] of [['beginner', 3], ['intermediate', 7]]) {
    for (let i = 0; i < n; i++) {
      const reg = addRegistration(ctx.fake, { registrationType: 'advance', skillLevel: level });
      await ctx.payments.joinMatchingBucket(reg);
    }
  }

  const start = getEventStartUtcMs(DATE);
  t.mock.timers.enable({ apis: ['Date'], now: start - 13 * 3600000 });
  let res = JSON.parse((await autoFinalize({})).body);
  assert.equal(res.formedCircles.length, 2, 'stage 1 runs inside 48 hours');
  assert.deepEqual(res.merges, [], 'no merge 13 hours before');

  t.mock.timers.setTime(start - 11.5 * 3600000);
  res = JSON.parse((await autoFinalize({})).body);
  assert.equal(res.merges.length, 1, 'merged 11.5 hours before');

  res = JSON.parse((await autoFinalize({})).body);
  assert.deepEqual(res.merges, [], 'nothing left to merge on the next run');
  t.mock.timers.reset();
});
