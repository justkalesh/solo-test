/**
 * @file netlify/shared/pricing.js
 * @description Dynamic festival pricing and currency formatting for SoloSaathi Circle.
 *
 * Implements tier-based fee calculation (standard ₹199 vs peak ₹249 dates) and currency
 * conversion into integer paise for Razorpay Orders API integration.
 */

// PLACEHOLDER — replace with real Navratri peak dates (weekends + last 1-2 days) before launch.
const PEAK_DATES = [
  '2026-10-17',
  '2026-10-18',
  '2026-10-24',
  '2026-10-25',
];

/**
 * Calculates registration fee in INR for an event date.
 * Peak dates incur ₹249, while standard event nights cost ₹199.
 *
 * @param {string} dateString - Event date string in 'YYYY-MM-DD' format.
 * @returns {number} Registration fee in Indian Rupees (INR).
 */
function getPrice(dateString) {
  if (typeof dateString === 'string' && PEAK_DATES.includes(dateString.trim())) {
    return 249;
  }
  return 199;
}

/**
 * Formats a rupee amount into integer paise for Razorpay integration.
 * Razorpay expects all transaction amounts in the smallest currency unit (1 INR = 100 paise).
 *
 * @param {number} priceInRupees - Price in INR (e.g., 199 or 249).
 * @returns {number} Price in paise as an integer (e.g., 19900 or 24900).
 */
function formatPriceForRazorpay(priceInRupees) {
  const numericPrice = Number(priceInRupees);
  if (isNaN(numericPrice) || numericPrice < 0) {
    throw new TypeError('priceInRupees must be a non-negative number');
  }
  return Math.round(numericPrice * 100);
}

module.exports = {
  PEAK_DATES,
  getPrice,
  formatPriceForRazorpay,
};
