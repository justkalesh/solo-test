/**
 * In-memory stand-in for netlify/shared/db.js, injected through require.cache so handlers can
 * be tested without Firestore. Covers the subset of the db.js contract the handlers use,
 * including transactions, batches and FieldValue.arrayUnion.
 */
const path = require('path');
const { compositeKey } = require('../../netlify/shared/keys');

const ARRAY_UNION = Symbol('arrayUnion');

function createFakeDb() {
  const store = {
    registrations: {},
    pools: {},
    groupstate: {},
    circles: {},
    showups: {},
    otp: {},
    otplimit: {},
    verified: {},
    organizers: {},
    config: {},
  };

  const clone = (value) => (value === undefined ? undefined : structuredClone(value));

  function applySet(collection, id, data, options = {}) {
    const existing = store[collection][id];
    const next = options.merge && existing ? { ...existing } : {};
    for (const [key, value] of Object.entries(data)) {
      if (value && value[ARRAY_UNION]) {
        const current = Array.isArray(next[key]) ? next[key] : [];
        next[key] = [...current, ...value.values.filter((v) => !current.includes(v))];
      } else {
        next[key] = clone(value);
      }
    }
    store[collection][id] = next;
  }

  const read = (ref) => {
    const data = store[ref.collection][ref.id];
    return { exists: data !== undefined, data: () => clone(data) };
  };

  // Like a Firestore DocumentReference: usable in transactions and batches, or directly
  const getDocRef = (collection, id) => ({
    collection,
    id,
    get: async () => read({ collection, id }),
    set: async (data, options) => applySet(collection, id, data, options),
  });

  const getPoolDocId = (city, venue, level, genderPref, eventDate) =>
    compositeKey(city, venue, level, genderPref, eventDate);
  const getGroupStateDocId = (city, venue, level, genderPref, date) =>
    compositeKey(city, venue, level, genderPref, date);
  const getShowupDocId = (city, venue, date) => compositeKey(city, venue, date);

  async function getCircleState(circleId) {
    return clone(store.circles[circleId]) || null;
  }

  const fake = {
    db: {},
    store,
    FieldValue: { arrayUnion: (...values) => ({ [ARRAY_UNION]: true, values }) },
    getDocRef,
    getPoolDocId,
    getGroupStateDocId,
    getShowupDocId,
    async runTransaction(fn) {
      const tx = {
        get: async (ref) => read(ref),
        set: (ref, data, options) => applySet(ref.collection, ref.id, data, options),
      };
      return fn(tx);
    },
    runBatch() {
      const ops = [];
      return {
        set: (ref, data, options) => ops.push([ref, data, options]),
        commit: async () => ops.forEach(([ref, data, options]) => applySet(ref.collection, ref.id, data, options)),
      };
    },
    async getRegistration(id) {
      return clone(store.registrations[id]) || null;
    },
    async saveRegistration(id, data) {
      applySet('registrations', id, data, { merge: true });
      return data;
    },
    async getRegistrationsByMobile(whatsapp, date) {
      return Object.values(store.registrations)
        .filter((r) => r.whatsapp === whatsapp && (!date || r.eventDate === date))
        .map(clone);
    },
    async getPendingPool(city, venue, level, genderPref, eventDate) {
      return clone(store.pools[getPoolDocId(city, venue, level, genderPref, eventDate)]?.poolArray) || [];
    },
    async savePendingPool(city, venue, level, genderPref, eventDate, poolArray) {
      applySet('pools', getPoolDocId(city, venue, level, genderPref, eventDate), { poolArray }, { merge: true });
    },
    async getGroupState(city, venue, level, genderPref, date) {
      return clone(store.groupstate[getGroupStateDocId(city, venue, level, genderPref, date)]) || null;
    },
    async saveGroupState(city, venue, level, genderPref, date, state) {
      applySet('groupstate', getGroupStateDocId(city, venue, level, genderPref, date), state, { merge: true });
    },
    getCircleState,
    async getCurrentCircleState(circleId) {
      let circle = await getCircleState(circleId);
      for (let hops = 0; circle && circle.status === 'merged' && circle.mergedInto && hops < 5; hops++) {
        circle = await getCircleState(circle.mergedInto);
      }
      return circle;
    },
    async saveCircleState(circleId, state) {
      applySet('circles', circleId, state, { merge: true });
      return state;
    },
    async getShowups(city, venue, date) {
      return clone(store.showups[getShowupDocId(city, venue, date)]?.showupsArray) || [];
    },
    async saveShowups(city, venue, showupsArray, date) {
      applySet('showups', getShowupDocId(city, venue, date), { showupsArray }, { merge: true });
    },
    async getVenues() {
      return clone(store.config.venues) || {};
    },
    async getOrganizer(venueId) {
      return clone(store.organizers[String(venueId).trim().toUpperCase()]) || null;
    },
    async saveOrganizer(venueId, data) {
      const id = String(venueId).trim().toUpperCase();
      applySet('organizers', id, { ...data, venueId: id }, { merge: true });
    },
  };
  return fake;
}

const DB_PATH = path.resolve(__dirname, '../../netlify/shared/db.js');

/** Installs a fresh fake db and clears cached backend modules so they pick it up. */
function installFakeDb() {
  const fake = createFakeDb();
  for (const key of Object.keys(require.cache)) {
    if (key.includes(`${path.sep}netlify${path.sep}`)) delete require.cache[key];
  }
  require.cache[DB_PATH] = { id: DB_PATH, filename: DB_PATH, loaded: true, exports: fake };
  return fake;
}

module.exports = { createFakeDb, installFakeDb };
