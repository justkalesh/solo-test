/**
 * @file netlify/functions/payments/verify-payment.js
 * @description Client-Side Payment Signature Verification & Matching Activation Handler.
 *
 * Implements:
 * - Independent verification of Razorpay HMAC-SHA256 signature using RAZORPAY_KEY_SECRET.
 *   Uses constant-time comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
 * - Validation that submitted `razorpay_order_id` strictly matches the `orderId` stored on the
 *   attendee's registration record (defense against mismatched or replayed order submissions).
 * - Updates registration `paymentStatus` to 'confirmed'.
 * - Gated Matching Activation:
 *   Calls `joinMatchingBucket(registration)` ONLY AFTER payment signature verification succeeds.
 *   Ordering rationale: Registration writes a pending draft first, payment confirms second,
 *   THEN the attendee is admitted into the live circle or advance matching pool. This guarantees
 *   unpaid registrations can never occupy circle seats or distort gender balance caps.
 */

const crypto = require('crypto');
const env = require('../../config/env');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const db = require('../../shared/db');
const { joinMatchingBucket, maskSecret } = require('../../shared/payment-helpers');

/**
 * Verifies the Razorpay payment signature using HMAC-SHA256 in constant time.
 *
 * Signature calculation:
 *   HMAC-SHA256( RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}` )
 *
 * @param {string} orderId - Razorpay Order ID.
 * @param {string} paymentId - Razorpay Payment ID.
 * @param {string} signature - Razorpay Signature submitted by client.
 * @returns {boolean} True if signature is cryptographically authentic.
 */
function verifyRazorpaySignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature) return false;

  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
  const actualBuffer = Buffer.from(signature, 'utf-8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Netlify Function Handler: Validates checkout payment signature and enters attendee into matching.
 *
 * @param {Object} event - Netlify HTTP event.
 * @param {Object} context - Netlify execution context.
 * @returns {Promise<Object>} Netlify HTTP response.
 */
exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return errorResponse('Method Not Allowed. Use POST.', 405);
  }

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return errorResponse('Invalid JSON body in request payload.', 400);
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    registrationId,
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !registrationId) {
    return errorResponse(
      'Missing required verification fields: razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId.',
      400
    );
  }

  try {
    // 1. Fetch attendee registration draft
    const registration = await db.getRegistration(registrationId);
    if (!registration) {
      return errorResponse(`Registration record not found for id: '${registrationId}'.`, 404);
    }

    // 2. Order ID validation (fail-fast defense against replay attacks):
    // Stored orderId must exist and match razorpay_order_id. Without this, a real payment
    // signature from ANY order could be replayed against a different registrationId that hasn't
    // had an order created yet, letting one real payment confirm multiple unrelated registrations
    // for free.
    if (!registration.orderId || registration.orderId !== razorpay_order_id) {
      console.warn(
        `[verify-payment order mismatch] Stored order: ${registration.orderId}, Submitted: ${razorpay_order_id}`
      );
      return errorResponse(
        'Order ID mismatch. The payment order submitted does not match the registration record.',
        400
      );
    }

    // 3. Cryptographic signature check
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      console.warn(
        `[verify-payment signature failure] Mismatched signature for registrationId: ${registrationId}, order: ${razorpay_order_id}`
      );

      // Mark payment failed in DB — do NOT enter matching bucket
      await db.saveRegistration(registrationId, {
        ...registration,
        paymentStatus: 'failed',
        paymentFailureReason: 'Signature verification failed',
        failedAt: Date.now(),
      });

      return errorResponse(
        'Invalid payment signature. Payment verification failed; attendee has not been placed into matching.',
        400
      );
    }

    // 4. Update registration to 'confirmed' status
    const now = Date.now();
    const updatedRegistration = {
      ...registration,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      paymentSignature: razorpay_signature,
      paymentStatus: 'confirmed',
      paidAt: now,
    };

    await db.saveRegistration(registrationId, updatedRegistration);

    // 5. GATED MATCHING ACTIVATION:
    // IMPORTANT: Registration writes pending record first, payment confirms second, THEN the attendee
    // actually enters the live or advance matching bucket. This prevents unpaid drafts from occupying
    // circle slots or skewing the gender balancing caps.
    const matchingResult = await joinMatchingBucket(updatedRegistration);

    return successResponse({
      registrationId,
      paymentStatus: 'confirmed',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      matching: matchingResult,
      message:
        registration.registrationType === 'live'
          ? 'Payment confirmed! You have been matched into your festival circle.'
          : 'Payment confirmed! You have been placed into the advance matching pool. Circles will be announced 48 hours prior to the event.',
    });
  } catch (error) {
    console.error(
      `[verify-payment fatal error] reg: ${registrationId}, secret: ${maskSecret(env.RAZORPAY_KEY_SECRET)}:`,
      error.message
    );
    return errorResponse(
      error.message || 'Internal server error during payment verification.',
      500
    );
  }
};
