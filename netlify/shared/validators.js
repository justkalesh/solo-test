/**
 * @file netlify/shared/validators.js
 * @description Request payload validation rules for SoloSaathi Circle APIs.
 *
 * Implements strict schema checks for attendee registration, OTP dispatch and verification,
 * and payment initiation. All validators accumulate every validation failure rather than
 * short-circuiting, and guarantee that they will never throw an exception.
 */

/**
 * Validates an Indian mobile phone number (10 digits starting with 6, 7, 8, or 9,
 * with optional +91 or 91 country code prefix and optional whitespace/dashes).
 *
 * @param {*} number - The phone number input to test.
 * @returns {boolean} True if the number matches Indian mobile format.
 */
function isValidIndianMobile(number) {
  if (typeof number !== 'string' && typeof number !== 'number') {
    return false;
  }
  const cleaned = String(number).trim().replace(/[\s\-]/g, '');
  return /^(?:\+91|91)?[6-9]\d{9}$/.test(cleaned);
}

/**
 * Validates the attendee registration payload.
 *
 * Checks:
 * - name: non-empty string
 * - whatsapp: valid 10-digit Indian mobile number (optionally with +91)
 * - city: non-empty string
 * - venue: non-empty string
 * - gender: must be one of 'male', 'female', 'prefer_not_to_say'
 * - ageBand: non-empty string
 * - skillLevel: must be one of 'beginner', 'intermediate', 'advanced'
 * - allWomenToggle: boolean
 * - captainOptIn: boolean
 * - ticket verification:
 *     if requirePhoto is true, requires ticketPhoto (base64 string);
 *     otherwise accepts either ticketSerial (string) OR ticketPhoto (base64 string).
 *
 * @param {Object} payload - The request payload to validate.
 * @param {Object} [options={}] - Validation options.
 * @param {boolean} [options.requirePhoto=false] - Whether ticketPhoto base64 is mandatory.
 * @returns {{valid: boolean, errors: string[]}} Validation status and accumulated errors.
 */
function validateRegistrationPayload(payload, { requirePhoto = false } = {}) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['Payload must be a non-null JSON object'] };
  }

  // 1. Name validation
  if (typeof payload.name !== 'string' || payload.name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string');
  }

  // 2. WhatsApp mobile validation
  if (!isValidIndianMobile(payload.whatsapp)) {
    errors.push(
      'whatsapp is required and must be a valid 10-digit Indian mobile number (e.g., 9876543210 or +919876543210)'
    );
  }

  // 3. City validation
  if (typeof payload.city !== 'string' || payload.city.trim().length === 0) {
    errors.push('city is required and must be a non-empty string');
  }

  // 4. Venue validation
  if (typeof payload.venue !== 'string' || payload.venue.trim().length === 0) {
    errors.push('venue is required and must be a non-empty string');
  }

  // 5. Gender validation
  const ALLOWED_GENDERS = ['male', 'female', 'prefer_not_to_say'];
  if (!ALLOWED_GENDERS.includes(payload.gender)) {
    errors.push(
      `gender is required and must be one of: ${ALLOWED_GENDERS.join(', ')}`
    );
  }

  // 6. Age band validation
  if (typeof payload.ageBand !== 'string' || payload.ageBand.trim().length === 0) {
    errors.push('ageBand is required and must be a non-empty string');
  }

  // 7. Skill level validation
  const ALLOWED_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'];
  if (!ALLOWED_SKILL_LEVELS.includes(payload.skillLevel)) {
    errors.push(
      `skillLevel is required and must be one of: ${ALLOWED_SKILL_LEVELS.join(', ')}`
    );
  }

  // 8. All-women circle preference toggle
  if (typeof payload.allWomenToggle !== 'boolean') {
    errors.push('allWomenToggle is required and must be a boolean');
  }

  // 9. Circle captain volunteer opt-in
  if (typeof payload.captainOptIn !== 'boolean') {
    errors.push('captainOptIn is required and must be a boolean');
  }

  // 10. Ticket verification (Serial vs Base64 Photo)
  if (requirePhoto) {
    if (
      typeof payload.ticketPhoto !== 'string' ||
      payload.ticketPhoto.trim().length === 0
    ) {
      errors.push(
        'ticketPhoto is required as a non-empty base64 string when requirePhoto is enabled'
      );
    }
  } else {
    const hasSerial =
      typeof payload.ticketSerial === 'string' &&
      payload.ticketSerial.trim().length > 0;
    const hasPhoto =
      typeof payload.ticketPhoto === 'string' &&
      payload.ticketPhoto.trim().length > 0;

    if (!hasSerial && !hasPhoto) {
      errors.push(
        'Either ticketSerial (string) or ticketPhoto (base64 string) must be provided'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates the payload for requesting an OTP dispatch.
 *
 * @param {Object} payload - The OTP send payload.
 * @returns {{valid: boolean, errors: string[]}} Validation status and accumulated errors.
 */
function validateOtpSendPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['Payload must be a non-null JSON object'] };
  }

  if (!isValidIndianMobile(payload.whatsapp)) {
    errors.push(
      'whatsapp is required and must be a valid 10-digit Indian mobile number (e.g., 9876543210 or +919876543210)'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates the payload for verifying an entered OTP code.
 *
 * @param {Object} payload - The OTP verify payload.
 * @returns {{valid: boolean, errors: string[]}} Validation status and accumulated errors.
 */
function validateOtpVerifyPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['Payload must be a non-null JSON object'] };
  }

  // WhatsApp mobile validation
  if (!isValidIndianMobile(payload.whatsapp)) {
    errors.push(
      'whatsapp is required and must be a valid 10-digit Indian mobile number (e.g., 9876543210 or +919876543210)'
    );
  }

  // 6-digit OTP code validation
  const codeStr =
    typeof payload.code === 'string'
      ? payload.code.trim()
      : typeof payload.code === 'number'
      ? String(payload.code).trim()
      : '';

  if (!/^\d{6}$/.test(codeStr)) {
    errors.push('code is required and must be a 6-digit numeric string');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates the payload for initializing a Razorpay checkout order.
 *
 * @param {Object} payload - The payment initialization payload.
 * @returns {{valid: boolean, errors: string[]}} Validation status and accumulated errors.
 */
function validatePaymentInitPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['Payload must be a non-null JSON object'] };
  }

  const hasRegId =
    typeof payload.registrationId === 'string' &&
    payload.registrationId.trim().length > 0;
  const hasSessionId =
    typeof payload.sessionId === 'string' &&
    payload.sessionId.trim().length > 0;

  if (!hasRegId && !hasSessionId) {
    errors.push(
      'Either registrationId or sessionId is required and must be a non-empty string'
    );
  }

  const isAmountValid =
    typeof payload.amount === 'number' &&
    !isNaN(payload.amount) &&
    payload.amount > 0;

  if (!isAmountValid) {
    errors.push('amount is required and must be a positive number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  isValidIndianMobile,
  validateRegistrationPayload,
  validateOtpSendPayload,
  validateOtpVerifyPayload,
  validatePaymentInitPayload,
};
