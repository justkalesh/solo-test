/**
 * @file netlify/functions/payments/create-order.js
 * @description Razorpay Order Creation Handler for SoloSaathi Circle (Live Mode).
 *
 * Implements:
 * - Gating payment initiation against an existing pending registration record.
 * - Server-side dynamic price determination via `netlify/shared/pricing.js` (₹199 standard / ₹249 peak).
 *   Amount is NEVER accepted from client input to prevent payment tampering.
 * - Official Razorpay SDK (`razorpay`) client initialization with credentials from `netlify/config/env.js`.
 * - Persistence of the created `orderId` on the attendee's registration document in Firestore.
 * - Secure response returning `orderId`, `amount` (paise), `currency`, `registrationId`, and public `keyId`.
 */

const Razorpay = require('razorpay');
const env = require('../../config/env');
const { getPrice, formatPriceForRazorpay } = require('../../shared/pricing');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');
const db = require('../../shared/db');
const { maskSecret } = require('../../shared/payment-helpers');

/**
 * Netlify Function Handler: Creates a Razorpay Order for a pending festival registration.
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

  const registrationId = String(body.registrationId || '').trim();
  if (!registrationId) {
    return errorResponse('registrationId is required to create a payment order.', 400);
  }

  try {
    // 1. Look up existing registration draft
    const registration = await db.getRegistration(registrationId);
    if (!registration) {
      return errorResponse(
        `Registration record not found for id: '${registrationId}'. Please register before initiating payment.`,
        404
      );
    }

    // 2. Validate current payment status
    if (registration.paymentStatus === 'confirmed' || registration.paymentStatus === 'paid') {
      return errorResponse(
        'Payment for this registration has already been confirmed. No new order needed.',
        400,
        {
          registrationId,
          paymentStatus: registration.paymentStatus,
          orderId: registration.orderId,
          circleId: registration.circleId || null,
        }
      );
    }

    // 3. Server-side price calculation (strict: client amount is disregarded)
    const eventDate = registration.eventDate || body.date;
    if (!eventDate) {
      return errorResponse('Missing event date on registration record.', 400);
    }

    const priceInRupees = getPrice(eventDate);
    const amountInPaise = formatPriceForRazorpay(priceInRupees);

    // 4. Initialize Razorpay Client (Live Mode)
    // Keys read strictly from centralized env.js
    const razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });

    // 5. Create Razorpay Order
    // Razorpay receipt length limit: max 40 characters
    const receipt = `rcpt_${registrationId.slice(-30)}`;
    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        registrationId,
        city: registration.city || '',
        venue: registration.venue || '',
        registrationType: registration.registrationType || 'live',
        eventDate,
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    // 6. Persist orderId on pending registration for subsequent verification & webhook lookup
    const updatedRegistration = {
      ...registration,
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      orderCreatedAt: Date.now(),
    };

    await db.saveRegistration(registrationId, updatedRegistration);

    // 7. Return order details + public keyId to client
    // Note: RAZORPAY_KEY_ID is public and needed by frontend checkout widget; secret is never returned.
    return successResponse({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID,
      registrationId,
      eventDate,
      priceInRupees,
    }, 201);
  } catch (error) {
    // Mask sensitive config in logs for security compliance
    console.error(
      `[create-order fatal error] keyId: ${maskSecret(env.RAZORPAY_KEY_ID)}:`,
      error.message
    );
    return errorResponse(
      error.message || 'Internal server error while creating payment order.',
      500
    );
  }
};
