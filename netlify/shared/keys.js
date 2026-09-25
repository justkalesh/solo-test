/**
 * @file netlify/shared/keys.js
 * @description Pure helpers for building Firestore document IDs from partition values
 * (city, venue, level, genderPref, date). Shared by db.js and matching.js so every module
 * turns "United Way Garba Grounds" into the same "united_way_garba_grounds" segment.
 */

/**
 * Converts a value into a key-safe slug: lowercase, runs of other characters become "_".
 *
 * @param {*} str - Value to slugify (null/undefined become '').
 * @returns {string} Slug, e.g. "United Way Garba Grounds" → "united_way_garba_grounds".
 */
function slugify(str) {
  return String(str ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Joins slugified parts with "_" to build a composite document ID.
 *
 * @param {...*} parts - Key segments (city, venue, level, etc.).
 * @returns {string} Composite key.
 */
function compositeKey(...parts) {
  return parts.map(slugify).join('_');
}

module.exports = {
  slugify,
  compositeKey,
};
