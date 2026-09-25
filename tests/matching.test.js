require('./helpers/setup-env');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCircleId,
  buildCircleName,
  checkGenderCap,
  planSmallCircleMerges,
  getEventStartUtcMs,
  getHoursUntilEvent,
  isAdvanceRegistrationOpen,
  isLiveRegistrationOpen,
} = require('../netlify/shared/matching');
const { getPrice } = require('../netlify/shared/pricing');
const { isValidIndianMobile, validateRegistrationPayload } = require('../netlify/shared/validators');

const circle = (circleId, skillLevel, size, extra = {}) => ({
  circleId,
  skillLevel,
  size,
  maleCount: 0,
  femaleCount: 0,
  isAllWomen: false,
  ...extra,
});

test('circle IDs are unique per venue and night; names stay short', () => {
  const a = buildCircleId('intermediate', 'mixed', 1, { city: 'Ahmedabad', venue: 'United Way Garba Grounds', eventDate: '2026-10-17' });
  const b = buildCircleId('intermediate', 'mixed', 1, { city: 'Ahmedabad', venue: 'GMDC Ground', eventDate: '2026-10-17' });
  const c = buildCircleId('intermediate', 'mixed', 1, { city: 'Ahmedabad', venue: 'GMDC Ground', eventDate: '2026-10-18' });
  assert.equal(a, 'TAAL-01_ahmedabad_united_way_garba_grounds_2026_10_17');
  assert.notEqual(a, b);
  assert.notEqual(b, c);
  assert.equal(buildCircleName('beginner', 'allWomen', 3), 'SAKHI 03');
  assert.equal(buildCircleName('advanced', 'mixed', 12), 'RAAS 12');
});

test('gender cap: 10 per declared gender in mixed circles only', () => {
  assert.equal(checkGenderCap({ male: 9 }, 'male'), false);
  assert.equal(checkGenderCap({ male: 10 }, 'male'), true);
  assert.equal(checkGenderCap({ female: 10 }, 'prefer_not_to_say'), false);
  assert.equal(checkGenderCap({ female: 30 }, 'female', true), false);
});

test('merge: 3 beginners join an intermediate circle of 7', () => {
  const { moves, flagged } = planSmallCircleMerges([circle('B', 'beginner', 3), circle('I', 'intermediate', 7)]);
  assert.deepEqual(moves, [{ from: 'B', to: 'I' }]);
  assert.deepEqual(flagged, []);
});

test('merge: 3 Pro Raas join an intermediate circle of 10, but not one of 11', () => {
  assert.deepEqual(
    planSmallCircleMerges([circle('A', 'advanced', 3), circle('I', 'intermediate', 10)]).moves,
    [{ from: 'A', to: 'I' }]
  );
  const blocked = planSmallCircleMerges([circle('A', 'advanced', 3), circle('I', 'intermediate', 11)]);
  assert.deepEqual(blocked.moves, []);
  assert.deepEqual(blocked.flagged, ['A']);
});

test('merge: a lone intermediate goes to the fuller eligible neighbour, ties to the lower tier', () => {
  const fuller = planSmallCircleMerges([
    circle('I', 'intermediate', 1),
    circle('B', 'beginner', 6),
    circle('A', 'advanced', 9),
  ]);
  assert.deepEqual(fuller.moves, [{ from: 'I', to: 'A' }]);
  const tie = planSmallCircleMerges([
    circle('I', 'intermediate', 1),
    circle('B', 'beginner', 6),
    circle('A', 'advanced', 6),
  ]);
  assert.deepEqual(tie.moves, [{ from: 'I', to: 'B' }]);
});

test('merge: beginner 2 + intermediate 3 become one circle of 5', () => {
  const { moves } = planSmallCircleMerges([circle('B', 'beginner', 2), circle('I', 'intermediate', 3)]);
  assert.deepEqual(moves, [{ from: 'B', to: 'I' }]);
});

test('merge: Pro Raas never jumps straight to beginner', () => {
  const { moves, flagged } = planSmallCircleMerges([circle('A', 'advanced', 2), circle('B', 'beginner', 5)]);
  assert.deepEqual(moves, []);
  assert.deepEqual(flagged, ['A']);
});

test('merge: a same-tier receiver is preferred over a neighbouring tier', () => {
  const { moves } = planSmallCircleMerges([
    circle('I1', 'intermediate', 2),
    circle('I2', 'intermediate', 5),
    circle('B', 'beginner', 9),
  ]);
  assert.deepEqual(moves, [{ from: 'I1', to: 'I2' }]);
});

test('merge: a move that would break the gender cap picks another receiver or is flagged', () => {
  const other = planSmallCircleMerges([
    circle('B', 'beginner', 3, { maleCount: 3 }),
    circle('I', 'intermediate', 9, { maleCount: 9 }),
    circle('I2', 'intermediate', 4, { maleCount: 2 }),
  ]);
  assert.deepEqual(other.moves, [{ from: 'B', to: 'I2' }]);
  const none = planSmallCircleMerges([
    circle('B', 'beginner', 3, { maleCount: 3 }),
    circle('I', 'intermediate', 9, { maleCount: 9 }),
  ]);
  assert.deepEqual(none.flagged, ['B']);
});

test('merge: receivers stop at 10 as small circles move in', () => {
  const { moves, flagged } = planSmallCircleMerges([
    circle('B1', 'beginner', 3),
    circle('B2', 'beginner', 3),
    circle('I', 'intermediate', 8),
  ]);
  // B1 -> B2 (same tier) makes 6; 6 is no longer small, so nothing else moves
  assert.deepEqual(moves, [{ from: 'B1', to: 'B2' }]);
  assert.deepEqual(flagged, []);
});

test('event timing: 7:30 PM IST start, merge window 12h before, advance cutoff 2h before', () => {
  const start = getEventStartUtcMs('2026-10-17');
  assert.equal(new Date(start).toISOString(), '2026-10-17T14:00:00.000Z');
  assert.equal(getHoursUntilEvent('2026-10-17', start - 12 * 3600000), 12);
  assert.equal(isAdvanceRegistrationOpen('2026-10-17', new Date(start - 2 * 3600000 - 1)).isOpen, true);
  assert.equal(isAdvanceRegistrationOpen('2026-10-17', new Date(start - 2 * 3600000)).isOpen, false);
});

test('live window: 6:30 PM to 1:30 AM IST from 13 Oct, after midnight counts as the previous night', () => {
  const ist = (iso) => new Date(new Date(iso).getTime() - 5.5 * 3600000);
  assert.equal(isLiveRegistrationOpen(ist('2026-10-13T18:30:00Z')).isOpen, true);
  assert.equal(isLiveRegistrationOpen(ist('2026-10-13T18:29:00Z')).isOpen, false);
  const afterMidnight = isLiveRegistrationOpen(ist('2026-10-14T01:00:00Z'));
  assert.equal(afterMidnight.isOpen, true);
  assert.equal(afterMidnight.festivalDate, '2026-10-13');
  assert.equal(isLiveRegistrationOpen(ist('2026-10-12T20:00:00Z')).isOpen, false);
});

test('pricing and validators', () => {
  assert.equal(getPrice('2026-10-17'), 249);
  assert.equal(getPrice('2026-10-15'), 199);
  assert.equal(isValidIndianMobile('+91 90000 00001'), true);
  assert.equal(isValidIndianMobile('5000000001'), false);
  const result = validateRegistrationPayload({ whatsapp: 'x' });
  assert.equal(result.valid, false);
});
