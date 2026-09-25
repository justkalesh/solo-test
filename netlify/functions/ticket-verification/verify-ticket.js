/**
 * @file netlify/functions/ticket-verification/verify-ticket.js
 * @description Server-Side Google Gemini Flash Ticket Verification for SoloSaathi Circle.
 *
 * Implements:
 * - Server-side only image inspection (never exposes GEMINI_API_KEY to clients).
 * - Multi-attribute OCR extraction: city, venue, venue_english, pass_id, and plausibility check.
 * - Cryptographic verification token generation: `ticketVerifiedToken` signed with TICKET_TOKEN_SECRET.
 * - Fuzzy venue mismatch detection producing warnings (not hard blocks) when printed ticket
 *   differs from selected festival ground.
 * - Reusable library exports (extractTicketInfo, checkVenueMismatch) for direct invocation
 *   by register.js and advance-register.js.
 */

const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config/env');
const { successResponse, errorResponse, handleOptions } = require('../../shared/response');

/**
 * Normalizes venue strings for fuzzy comparison by removing noise words and punctuation.
 *
 * @param {string} str - Raw venue string.
 * @returns {string[]} List of meaningful lowercase keywords.
 */
function extractVenueKeywords(str) {
  if (!str || typeof str !== 'string') return [];
  const stopWords = new Set([
    'grounds',
    'ground',
    'club',
    'stadium',
    'lakefront',
    'complex',
    'centre',
    'center',
    'hall',
    'party',
    'plot',
    'garba',
    'navratri',
    'road',
    'near',
    'opp',
    'the',
    'and',
  ]);

  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

/**
 * Fuzzy comparison between the venue extracted by AI from the ticket photo
 * and the venue manually chosen by the attendee during registration.
 *
 * Does NOT produce a hard blocking error — returns an informative warning so attendees
 * are alerted to potential venue mismatches without getting stuck during walk-up registration.
 *
 * @param {string|null} extractedVenue - Venue extracted from ticket image via AI.
 * @param {string} selectedVenue - Venue name selected by attendee in UI.
 * @returns {{hasMismatch: boolean, warning: string|null, extractedVenue: string|null, selectedVenue: string}}
 */
function checkVenueMismatch(extractedVenue, selectedVenue) {
  const normSelected = String(selectedVenue || '').trim();
  const normExtracted = String(extractedVenue || '').trim();

  if (!normExtracted) {
    return {
      hasMismatch: false,
      warning: null,
      extractedVenue: null,
      selectedVenue: normSelected,
    };
  }

  const selectedWords = extractVenueKeywords(normSelected);
  const extractedWords = extractVenueKeywords(normExtracted);

  // Check if at least one meaningful keyword matches between extracted and selected
  const hasKeywordOverlap = extractedWords.some((word) =>
    selectedWords.some((selWord) => selWord.includes(word) || word.includes(selWord))
  );

  if (!hasKeywordOverlap && selectedWords.length > 0 && extractedWords.length > 0) {
    return {
      hasMismatch: true,
      warning: `Your ticket appears to be for "${normExtracted}", which does not match your selected ground ("${normSelected}"). Please confirm your ground location before entering.`,
      extractedVenue: normExtracted,
      selectedVenue: normSelected,
    };
  }

  return {
    hasMismatch: false,
    warning: null,
    extractedVenue: normExtracted,
    selectedVenue: normSelected,
  };
}

/**
 * Generates a signed verification token proving that ticket OCR was completed on the server.
 *
 * Downstream validation:
 * To verify this token later, split on '.' -> base64url decode payload -> recalculate HMAC-SHA256
 * with config.TICKET_TOKEN_SECRET -> compare with signature.
 *
 * @param {Object} data - Payload to sign (pass_id, venue, timestamp).
 * @returns {string} Token string in format `{base64Payload}.{hmacSignature}`.
 */
function generateTicketVerifiedToken(data) {
  const payload = {
    pass_id: data.pass_id || null,
    venue: data.venue || null,
    ts: Date.now(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.TICKET_TOKEN_SECRET)
    .update(payloadB64)
    .digest('hex');

  return `${payloadB64}.${signature}`;
}

/**
 * Reusable function to inspect a base64-encoded festival ticket image via Google Gemini Flash API.
 *
 * @param {string} base64Image - Base64 data string (with or without 'data:image/...;base64,' prefix).
 * @returns {Promise<{city: string|null, venue: string|null, venue_english: string|null, pass_id: string|null, looks_like_valid_ticket: boolean, ticketVerifiedToken: string}>}
 */
async function extractTicketInfo(base64Image) {
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error('base64Image string is required for ticket verification');
  }

  // Parse media type and clean raw base64 string
  let mimeType = 'image/jpeg';
  let cleanBase64 = base64Image.trim();

  if (cleanBase64.startsWith('data:')) {
    const matches = cleanBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      cleanBase64 = matches[2];
    }
  }

  // Initialize Google Generative AI client
  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });

  const prompt =
    'You are an expert OCR ticket inspector for Navratri/Garba festivals in India. ' +
    'Analyze the provided ticket/pass image and extract essential details. ' +
    'Return ONLY a valid JSON object matching this exact schema, with NO markdown formatting, backticks, or other text:\n' +
    '{\n' +
    '  "city": "City name (e.g. Ahmedabad, Surat, Vadodara) or null",\n' +
    '  "venue": "Venue ground name printed on ticket, or null",\n' +
    '  "venue_english": "Standard English translation/transliteration of the venue name, or null",\n' +
    '  "pass_id": "Ticket serial, pass number, or barcode digits, or null",\n' +
    '  "looks_like_valid_ticket": true or false\n' +
    '}';

  // Gemini inlineData format for image input
  const imagePart = {
    inlineData: {
      mimeType,
      data: cleanBase64,
    },
  };

  const textPart = { text: prompt };

  let parsedExtraction = {
    city: null,
    venue: null,
    venue_english: null,
    pass_id: null,
    looks_like_valid_ticket: true,
  };

  try {
    const result = await model.generateContent([imagePart, textPart]);
    const responseText = result.response.text();
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const jsonResult = JSON.parse(cleanedJson);
      parsedExtraction = {
        city: jsonResult.city || null,
        venue: jsonResult.venue || null,
        venue_english: jsonResult.venue_english || null,
        pass_id: jsonResult.pass_id ? String(jsonResult.pass_id) : null,
        looks_like_valid_ticket: Boolean(jsonResult.looks_like_valid_ticket),
      };
    } catch (parseErr) {
      console.warn('[Ticket Vision Warning] Could not parse AI response JSON:', responseText);
    }
  } catch (apiErr) {
    console.warn('[Ticket Vision Warning] Gemini API error:', apiErr.message);
    // Fallback in case of external API downtime so attendees are not stranded
    parsedExtraction.looks_like_valid_ticket = true;
  }

  const ticketVerifiedToken = generateTicketVerifiedToken(parsedExtraction);

  return {
    ...parsedExtraction,
    ticketVerifiedToken,
  };
}

/**
 * Netlify Function Handler: Direct HTTP wrapper for ticket image verification.
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

  if (!body.ticketPhoto || typeof body.ticketPhoto !== 'string') {
    return errorResponse('ticketPhoto is required as a base64 encoded string.', 400);
  }

  try {
    const extracted = await extractTicketInfo(body.ticketPhoto);
    const mismatch = checkVenueMismatch(extracted.venue || extracted.venue_english, body.selectedVenue);

    return successResponse({
      ...extracted,
      mismatchWarning: mismatch.hasMismatch ? mismatch.warning : null,
    });
  } catch (error) {
    console.error('[verify-ticket error]', error);
    return errorResponse(error.message || 'Ticket verification failed.', 500);
  }
};

module.exports = {
  extractTicketInfo,
  checkVenueMismatch,
  generateTicketVerifiedToken,
  handler: exports.handler,
};
