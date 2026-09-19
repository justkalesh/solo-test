/**
 * @file netlify/shared/whatsapp.js
 * @description Outbound messaging gateway for WhatsApp Business Solution Provider (BSP) and SMS fallback.
 *
 * Dispatches transactional notifications, OTP codes, circle match announcements, and captain
 * instructions. If `config.OTP_DEV_MODE` is enabled, outbound network calls are bypassed and
 * logged to the console for testing.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const config = require('../config/env');

/**
 * Sends a JSON POST request using global fetch if available, falling back to native Node https/http.
 *
 * @param {string} endpointUrl - Target REST URL.
 * @param {Object<string, string>} headers - Request headers.
 * @param {Object} data - Payload body.
 * @returns {Promise<Object>} Parsed JSON response.
 */
async function postJson(endpointUrl, headers, data) {
  if (typeof fetch === 'function') {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${JSON.stringify(responseData)}`
      );
    }
    return responseData;
  }

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(endpointUrl);
    const transport = parsedUrl.protocol === 'http:' ? http : https;
    const bodyStr = JSON.stringify(data);

    const req = transport.request(
      parsedUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          ...headers,
        },
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => {
          resData += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(resData);
          } catch (e) {
            parsed = { raw: resData };
          }

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(
              new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`)
            );
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.write(bodyStr);
    req.end();
  });
}

/**
 * Dispatches an approved WhatsApp template message via the configured BSP REST API.
 *
 * @param {string} toNumber - Destination mobile number in international or 10-digit format.
 * @param {string} templateName - Registered BSP WhatsApp template slug.
 * @param {Object|Array} templateParams - Dynamic parameter values substituted into the template.
 * @returns {Promise<{success: boolean, providerResponse?: Object, error?: string}>}
 */
async function sendWhatsAppMessage(toNumber, templateName, templateParams) {
  // OTP_DEV_MODE must never be true in production.
  if (config.OTP_DEV_MODE) {
    console.log(
      `[DEV MODE - WhatsApp Simulated] To: ${toNumber} | Template: ${templateName} | Params:`,
      templateParams
    );
    return {
      success: true,
      providerResponse: {
        devMode: true,
        simulated: true,
        to: toNumber,
        template: templateName,
        params: templateParams,
      },
    };
  }

  try {
    const payload = {
      to: toNumber,
      template: templateName,
      params: templateParams,
    };

    const headers = {
      Authorization: `Bearer ${config.WHATSAPP_API_KEY}`,
      'x-api-key': config.WHATSAPP_API_KEY,
    };

    const providerResponse = await postJson(
      config.WHATSAPP_API_URL,
      headers,
      payload
    );

    return {
      success: true,
      providerResponse,
    };
  } catch (error) {
    console.error(
      `[WhatsApp Error] Failed to send template '${templateName}' to '***${String(toNumber).slice(-4)}':`,
      error.message
    );
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Dispatches an SMS fallback message using the configured SMS gateway and DLT template ID.
 *
 * @param {string} toNumber - Destination mobile number.
 * @param {string} message - Plain text SMS message content.
 * @returns {Promise<{success: boolean, providerResponse?: Object, error?: string}>}
 */
async function sendSmsMessage(toNumber, message) {
  // OTP_DEV_MODE must never be true in production.
  if (config.OTP_DEV_MODE) {
    console.log(
      `[DEV MODE - SMS Simulated] To: ${toNumber} | Message: ${message}`
    );
    return {
      success: true,
      providerResponse: {
        devMode: true,
        simulated: true,
        to: toNumber,
        message,
      },
    };
  }

  if (!config.SMS_API_URL || !config.SMS_API_KEY) {
    console.warn(
      '[SMS Warning] SMS fallback invoked but SMS_API_URL or SMS_API_KEY is not configured.'
    );
    return {
      success: false,
      error: 'SMS provider not configured',
    };
  }

  try {
    const payload = {
      to: toNumber,
      message,
      dltTemplateId: config.SMS_DLT_TEMPLATE_ID || '',
    };

    const headers = {
      Authorization: `Bearer ${config.SMS_API_KEY}`,
      'x-api-key': config.SMS_API_KEY,
    };

    const providerResponse = await postJson(
      config.SMS_API_URL,
      headers,
      payload
    );

    return {
      success: true,
      providerResponse,
    };
  } catch (error) {
    console.error(
      `[SMS Error] Failed to dispatch fallback SMS to '***${String(toNumber).slice(-4)}':`,
      error.message
    );
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendSmsMessage,
};
