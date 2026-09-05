/**
 * Central configuration for backend OTP security.
 *
 * Reads environment variables with safe defaults and never exposes
 * secret/token values to callers.
 */

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true" || String(value) === "1";
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function toFloat(value, fallback) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}

const config = {
  // Platform
  SUPPORTED_PLATFORMS: ["web", "android", "ios"],

  // reCAPTCHA
  RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY || "",
  RECAPTCHA_MIN_SCORE: toFloat(process.env.RECAPTCHA_MIN_SCORE, 0.7),

  // Android Play Integrity
  PLAY_INTEGRITY_ENABLED: toBool(process.env.PLAY_INTEGRITY_ENABLED, false),
  PLAY_INTEGRITY_PACKAGE_NAME: process.env.PLAY_INTEGRITY_PACKAGE_NAME || "",
  PLAY_INTEGRITY_CERTIFICATE_DIGESTS: (process.env.PLAY_INTEGRITY_CERTIFICATE_DIGESTS || "")
    .split(",")
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean),
  // Google Cloud project number and service-account key JSON used to verify
  // Express Integrity tokens (which are NOT JWS and cannot be verified locally).
  PLAY_INTEGRITY_CLOUD_PROJECT_NUMBER: process.env.PLAY_INTEGRITY_CLOUD_PROJECT_NUMBER || "",
  PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON: process.env.PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON || "",

  // iOS App Attest
  APP_ATTEST_ENABLED: toBool(process.env.APP_ATTEST_ENABLED, false),
  // Apple Developer Team ID (e.g. "ABCDE12345"). Combines with APP_ATTEST_APP_ID
  // (the iOS bundle identifier) to form the full Apple "App ID"
  // (<TeamID>.<BundleID>) whose SHA-256 is the App Attest RP ID hash.
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID || "",
  APP_ATTEST_APP_ID: process.env.APP_ATTEST_APP_ID || "",
  APP_ATTEST_ENVIRONMENT: process.env.APP_ATTEST_ENVIRONMENT || "production",

  // Distributed rate limits
  OTP_IP_RATE_LIMIT: toInt(process.env.OTP_IP_RATE_LIMIT, 10),
  OTP_PHONE_RATE_LIMIT: toInt(process.env.OTP_PHONE_RATE_LIMIT, 5),
  OTP_DEVICE_RATE_LIMIT: toInt(process.env.OTP_DEVICE_RATE_LIMIT, 5),
  OTP_RATE_LIMIT_WINDOW_SECONDS: toInt(process.env.OTP_RATE_LIMIT_WINDOW_SECONDS, 3600),
  OTP_COOLDOWN_SECONDS: toInt(process.env.OTP_COOLDOWN_SECONDS, 60),

  // Verification brute-force protection
  OTP_VERIFY_ATTEMPT_LIMIT: toInt(process.env.OTP_VERIFY_ATTEMPT_LIMIT, 5),
  OTP_VERIFY_WINDOW_SECONDS: toInt(process.env.OTP_VERIFY_WINDOW_SECONDS, 300),

  // Challenge / integrity nonce lifetime
  OTP_CHALLENGE_TTL_SECONDS: toInt(process.env.OTP_CHALLENGE_TTL_SECONDS, 300),
  OTP_INTEGRITY_REPLAY_WINDOW_SECONDS: toInt(process.env.OTP_INTEGRITY_REPLAY_WINDOW_SECONDS, 300),
};

module.exports = config;