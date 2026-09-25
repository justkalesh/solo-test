/**
 * @file netlify/shared/organizer-accounts.js
 * @description Password hashing for organizer accounts (Firestore `organizers/{VENUE_ID}`).
 *
 * Uses Node's built-in scrypt with a per-account random salt. Shared by
 * functions/organizer/admin-auth.js (login) and scripts/create-organizer.js (account setup).
 */

const crypto = require('crypto');

const SCRYPT_KEY_LENGTH = 64;

/**
 * Hashes an organizer password with scrypt.
 *
 * @param {string} password - Plain password.
 * @param {string} salt - Hex salt.
 * @returns {string} Hex hash.
 */
function hashOrganizerPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, SCRYPT_KEY_LENGTH).toString('hex');
}

/**
 * Builds the stored credential fields for a new password.
 *
 * @param {string} password - Plain password.
 * @returns {{passwordHash: string, salt: string}}
 */
function createPasswordRecord(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { passwordHash: hashOrganizerPassword(password, salt), salt };
}

/**
 * Checks a password against a stored account in constant time.
 *
 * @param {Object} account - Organizer account ({ passwordHash, salt }).
 * @param {string} password - Plain password.
 * @returns {boolean}
 */
function checkOrganizerPassword(account, password) {
  if (!account || !account.passwordHash || !account.salt) return false;
  const expected = Buffer.from(account.passwordHash, 'hex');
  const provided = Buffer.from(hashOrganizerPassword(password, account.salt), 'hex');
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

module.exports = {
  hashOrganizerPassword,
  createPasswordRecord,
  checkOrganizerPassword,
};
