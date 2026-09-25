/**
 * @file scripts/create-organizer.js
 * @description Creates (or resets the password of) a venue organizer account.
 *
 * Usage, from the repo root (needs FIREBASE_SERVICE_ACCOUNT in .env):
 *   node --env-file=.env scripts/create-organizer.js <VENUE_ID> <City> "<Venue name>"
 *   node --env-file=.env scripts/create-organizer.js AH-UNIT Ahmedabad "United Way Garba Grounds"
 *
 * City and venue must match the names attendees register with (Firestore config/venues), since
 * the dashboard reads that venue's circles. A random password is printed once; only its salted
 * scrypt hash is stored. Running it again for the same venue ID issues a new password.
 * Add `--disable` to switch an account off instead.
 */

const crypto = require('crypto');
const db = require('../netlify/shared/db');
const { createPasswordRecord } = require('../netlify/shared/organizer-accounts');

async function main() {
  const args = process.argv.slice(2);
  const disable = args.includes('--disable');
  const [venueIdArg, city, venue] = args.filter((a) => a !== '--disable');

  if (!db.db) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing. Run with: node --env-file=.env scripts/create-organizer.js ...');
  }
  if (!venueIdArg) {
    throw new Error('Usage: node --env-file=.env scripts/create-organizer.js <VENUE_ID> <City> "<Venue name>" [--disable]');
  }
  const venueId = venueIdArg.trim().toUpperCase();
  if (venueId.startsWith('DEMO-')) {
    throw new Error('Venue IDs starting with DEMO- are reserved for the in-browser demo accounts.');
  }

  if (disable) {
    await db.saveOrganizer(venueId, { disabled: true, updatedAt: Date.now() });
    console.log(`Organizer account ${venueId} disabled.`);
    return;
  }

  if (!city || !venue) {
    throw new Error('City and venue name are required, e.g. AH-UNIT Ahmedabad "United Way Garba Grounds".');
  }

  const existing = await db.getOrganizer(venueId);
  const password = crypto.randomBytes(9).toString('base64url'); // 12 characters
  await db.saveOrganizer(venueId, {
    city,
    venue,
    ...createPasswordRecord(password),
    disabled: false,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
  });

  console.log(`${existing ? 'Updated' : 'Created'} organizer account`);
  console.log(`  Venue ID: ${venueId}`);
  console.log(`  Venue:    ${city} / ${venue}`);
  console.log(`  Password: ${password}`);
  console.log('Share the password privately. It is not stored and will not be shown again.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
