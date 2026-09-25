/**
 * Placeholder environment for tests. netlify/config/env.js fails fast when a required variable
 * is missing, so every test file requires this before loading backend code.
 */
const PLACEHOLDERS = {
  ADMIN_SECRET: 'test_admin_secret',
  WHATSAPP_API_KEY: 'test',
  WHATSAPP_API_URL: 'https://example.invalid/whatsapp',
  GEMINI_API_KEY: 'test',
  RAZORPAY_KEY_ID: 'rzp_test_key',
  RAZORPAY_KEY_SECRET: 'test_razorpay_secret',
  RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret',
  TICKET_TOKEN_SECRET: 'test_ticket_secret',
  ATTENDEE_SESSION_SECRET: 'test_attendee_secret',
  FIREBASE_SERVICE_ACCOUNT: '{}',
  SMS_API_KEY: 'test',
  SMS_API_URL: 'https://example.invalid/sms',
  SMS_DLT_TEMPLATE_ID: 'test',
};

for (const [key, value] of Object.entries(PLACEHOLDERS)) {
  if (!process.env[key]) process.env[key] = value;
}

// Keep test output readable
for (const method of ['warn', 'error']) {
  const original = console[method];
  console[method] = (...args) => {
    if (process.env.TEST_VERBOSE) original(...args);
  };
}
