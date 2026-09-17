/**
 * @file netlify/functions/payments/webhook.js
 * @description Inbound Razorpay Webhook Handler for SoloSaathi Circle.
 *
 * Implements:
 * - Server-to-server webhook authentication independently of frontend client calls.
 * - Cryptographic verification of the `x-razorpay-signature` header against RAZORPAY_WEBHOOK_SECRET
 *   over the raw request body BEFORE parsing JSON. Uses constant-time timingSafeEqual.
 * - Idempotency protection against duplicate webhook deliveries:
 *   Verifies existing registration status; if already 'confirmed', skips duplicate matching
 *   and circle allocations without error.
 * - Handles:
 *   - `payment.captured` & `order.paid`: Confirms registration and calls `joinMatchingBucket()`.
 *   - `payment.failed`: Records failure status and logs reason safely (secrets masked).
 * - Fast HTTP 200 acknowledgement to satisfy Razorpay's webhook delivery timeout SLA.
 */

const crypto = require('crypto');
const env = require('../../config/env');
const db = require('../../shared/db');
const { joinMatchingBucket, maskSecret } = require('../../shared/payment-helpers');

/**
 * Verifies Razorpay Webhook signature over the raw HTTP request body.
 *
 * @param {string} rawBody - Unparsed raw HTTP request body string.
 * @param {string} signature - Header signature value (`x-razorpay-signature`).
 * @param {string} webhookSecret - Razorpay Webhook Secret from env.js.
 * @returns {boolean} True if signature is cryptographically valid.
 */
function verifyWebhookSignature(rawBody, signature, webhookSecret) {
  if (!rawBody || !signature || !webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
  const actualBuffer = Buffer.from(signature, 'utf-8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Netlify Function Handler: Processes inbound asynchronous Razorpay webhook events.
 *
 * @param {Object} event - Netlify HTTP event.
 * @param {Object} context - Netlify execution context.
 * @returns {Promise<Object>} Netlify HTTP response.
 */
exports.handler = async (event, context) => {
  // Webhooks from Razorpay are exclusively HTTP POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed. Webhook expects POST.' }),
    };
  }

  // 1. Extract raw body (handling potential base64 encoding by serverless gateway)
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || '';

  // 2. Extract signature header (case-insensitive fallback)
  const signature =
    event.headers['x-razorpay-signature'] ||
    event.headers['X-Razorpay-Signature'] ||
    '';

  // 3. CRITICAL SECURITY: Verify signature over raw body BEFORE parsing/trusting JSON
  const isAuthentic = verifyWebhookSignature(
    rawBody,
    signature,
    env.RAZORPAY_WEBHOOK_SECRET
  );

  if (!isAuthentic) {
    console.warn(
      `[webhook signature mismatch] Rejected untrusted webhook payload. Header signature was: ${signature ? signature.slice(0, 10) + '...' : '[EMPTY]'}`
    );
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid webhook signature.' }),
    };
  }

  // 4. Parse verified JSON payload
  let payload = {};
  try {
    payload = JSON.parse(rawBody);
  } catch (parseErr) {
    console.error('[webhook parse error] Verified body was not valid JSON:', parseErr.message);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Malformed JSON payload.' }),
    };
  }

  const eventType = payload.event;
  const eventId = payload.event_id || payload.id;
  console.log(`[webhook received] event: ${eventType}, eventId: ${eventId}`);

  try {
    // 5. Extract payment and order entities
    const paymentEntity = payload.payload?.payment?.entity || {};
    const orderEntity = payload.payload?.order?.entity || {};

    const orderId = paymentEntity.order_id || orderEntity.id || null;
    const paymentId = paymentEntity.id || null;
    const registrationId =
      paymentEntity.notes?.registrationId ||
      orderEntity.notes?.registrationId ||
      null;

    // -----------------------------------------------------------------------
    // EVENT: payment.captured OR order.paid (Payment Success)
    // -----------------------------------------------------------------------
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      if (!registrationId) {
        console.warn(`[webhook warning] No registrationId in notes for order: ${orderId}`);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ received: true, note: 'No registrationId attached in notes' }),
        };
      }

      const registration = await db.getRegistration(registrationId);
      if (!registration) {
        console.warn(`[webhook warning] Registration not found in DB: ${registrationId}`);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ received: true, note: 'Registration not found' }),
        };
      }

      // IDEMPOTENCY CHECK:
      // If payment is already marked confirmed, do NOT process duplicate matching or bucket entries.
      if (registration.paymentStatus === 'confirmed' || registration.paymentStatus === 'paid') {
        console.log(
          `[webhook idempotency] Registration ${registrationId} already confirmed. Skipping duplicate transition.`
        );
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ received: true, idempotent: true }),
        };
      }

      // Update registration record to confirmed
      const now = Date.now();
      const updatedRegistration = {
        ...registration,
        orderId: orderId || registration.orderId,
        paymentId: paymentId || registration.paymentId,
        paymentStatus: 'confirmed',
        webhookEventId: eventId,
        paidAt: now,
      };

      await db.saveRegistration(registrationId, updatedRegistration);

      // Execute shared matching-bucket join logic
      const matchingResult = await joinMatchingBucket(updatedRegistration);
      console.log(
        `[webhook success] Registration ${registrationId} matched via webhook:`,
        matchingResult.type
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ received: true, status: 'confirmed', matching: matchingResult }),
      };
    }

    // -----------------------------------------------------------------------
    // EVENT: payment.failed (Payment Failure)
    // -----------------------------------------------------------------------
    if (eventType === 'payment.failed') {
      const errorCode = paymentEntity.error_code || 'PAYMENT_FAILED';
      const errorDescription = paymentEntity.error_description || 'Payment was unsuccessful';

      console.warn(
        `[webhook payment.failed] reg: ${registrationId || 'unknown'}, order: ${orderId}, code: ${errorCode}: ${errorDescription}`
      );

      if (registrationId) {
        const registration = await db.getRegistration(registrationId);
        // Only mark failed if not already confirmed by a competing successful event
        if (registration && registration.paymentStatus !== 'confirmed') {
          await db.saveRegistration(registrationId, {
            ...registration,
            paymentStatus: 'failed',
            paymentFailureCode: errorCode,
            paymentFailureReason: errorDescription,
            failedAt: Date.now(),
          });
        }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ received: true, status: 'failed_recorded' }),
      };
    }

    // Default fast acknowledgement for unhandled webhook events (e.g., refund.processed)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ received: true, event: eventType }),
    };
  } catch (internalError) {
    // Log error with secrets protected
    console.error(
      `[webhook internal error] webhookSecret: ${maskSecret(env.RAZORPAY_WEBHOOK_SECRET)}:`,
      internalError.message
    );

    // Always respond 200 to Razorpay so it doesn't storm retries on business logic exceptions
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ received: true, error: 'Internal error logged' }),
    };
  }
};
