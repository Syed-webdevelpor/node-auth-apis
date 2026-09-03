/**
 * Safe security logging helper.
 *
 * Never log OTPs, tokens, secrets, private keys, assertions or attestation
 * objects. Only log small, non-sensitive metadata.
 */

function logSecurity({ platform, operation, result, reason, details }) {
  const safeDetails = {};
  if (details && typeof details === "object") {
    // Only ever copy explicitly whitelisted scalar metadata.
    for (const key of [
      "ipRate",
      "phoneRate",
      "deviceRate",
      "cooldown",
      "verifyRate",
      "recaptchaScore",
      "replay",
      "requestHash",
      "aaguid",
    ]) {
      const val = details[key];
      if (val !== undefined && val !== null) {
        safeDetails[key] = val;
      }
    }
  }

  const entry = {
    ts: new Date().toISOString(),
    what: "otp_security",
    platform,
    operation,
    result,
    reason,
    ...safeDetails,
  };

  console.log(JSON.stringify(entry));
}

module.exports = { logSecurity };