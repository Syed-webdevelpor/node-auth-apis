const { parsePhoneNumberFromString } = require("libphonenumber-js");

/**
 * Normalize a phone number to E.164.
 *
 * Used consistently before Redis rate-limiting keys and before any Twilio
 * request so that formatting differences cannot bypass rate limits.
 *
 * @param {*} raw - raw phone number from the client
 * @param {string} [defaultRegion] - ISO country code used when the number has
 *                                   no explicit country code.
 * @returns {{ valid: boolean, phone?: string, message?: string }}
 */
function normalizePhone(raw, defaultRegion) {
  if (!raw || typeof raw !== "string") {
    return { valid: false, message: "Phone number is required" };
  }

  try {
    const parsed = parsePhoneNumberFromString(raw.trim(), defaultRegion || undefined);
    if (!parsed || !parsed.isValid()) {
      return { valid: false, message: "Invalid phone number" };
    }
    return { valid: true, phone: parsed.number }; // E.164
  } catch (e) {
    return { valid: false, message: "Invalid phone number" };
  }
}

module.exports = { normalizePhone };