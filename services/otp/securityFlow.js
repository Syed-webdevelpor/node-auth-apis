const config = require("./config");
const { validatePlatform } = require("./platformValidator");
const { normalizePhone } = require("./phoneNormalizer");
const { verifyRecaptcha } = require("./RecaptchaService");
const PlayIntegrityService = require("./PlayIntegrityService");
const AppAttestService = require("./AppAttestService");
const { applyRequestLimits, applyVerifyLimits } = require("./OtpRateLimitService");
const { logSecurity } = require("./securityLogger");

/**
 * Run platform-specific attestation and return a trusted device identifier
 * (used for the device rate limit), or a rejection.
 */
async function applyPlatformSecurity({ req, body, operation, phone }) {
  const platform = body.platform;

  if (platform === "web") {
    const action = operation === "request" ? "requestOtp" : "verifyOtp";
    const recaptchaResult = await verifyRecaptcha(req, body.recaptchaToken, action);
    if (!recaptchaResult.success) {
      return { ok: false, statusCode: recaptchaResult.statusCode, error: recaptchaResult.message };
    }
    return { ok: true, deviceId: undefined };
  }

  if (platform === "android") {
    if (!PlayIntegrityService.isEnabled()) {
      // Not required when disabled; still a valid platform.
      return { ok: true, deviceId: undefined };
    }
    if (!PlayIntegrityService.isConfigured()) {
      logSecurity({ platform, operation, result: "error", reason: "play_integrity_not_configured" });
      return { ok: false, statusCode: 500, error: "Play Integrity is not configured" };
    }
    console.debug(
      `[PlayIntegrity] incoming android attestation — ` +
      `tokenLen=${typeof body.integrityToken === "string" ? body.integrityToken.length : "missing"}, ` +
      `nonceLen=${typeof body.integrityNonce === "string" ? body.integrityNonce.length : "missing"}`
    );
    const verdict = await PlayIntegrityService.verifyIntegrityToken({
      token: body.integrityToken,
      nonce: body.integrityNonce,
    });
    logSecurity({ platform, operation, result: verdict.verified ? "pass" : "block", reason: verdict.reason, details: { requestHash: verdict.requestHash } });
    if (!verdict.verified) {
      return { ok: false, statusCode: verdict.statusCode, error: "Device integrity verification failed" };
    }
    return { ok: true, deviceId: verdict.requestHash || undefined };
  }

  if (platform === "ios") {
    if (!AppAttestService.isEnabled()) {
      return { ok: true, deviceId: undefined };
    }
    if (!AppAttestService.isConfigured()) {
      logSecurity({ platform, operation, result: "error", reason: "app_attest_not_configured" });
      return { ok: false, statusCode: 500, error: "App Attest is not configured" };
    }
    const assertion = await AppAttestService.verifyDevice({
      keyId: body.appAttestKeyId,
      assertionB64: body.appAttestAssertion,
      clientDataB64: body.appAttestClientData,
      challenge: body.appAttestChallenge,
      phoneNumber: phone,
    });
    if (!assertion.success) {
      logSecurity({ platform, operation, result: "block", reason: assertion.reason });
      return { ok: false, statusCode: assertion.statusCode, error: "Device attestation failed" };
    }
    return { ok: true, deviceId: assertion.keyId };
  }

  return { ok: false, statusCode: 400, error: "Invalid platform" };
}

/**
 * Enforce the full security order for OTP *request*:
 *   validate request -> platform -> platform attestation ->
 *   IP limit -> phone limit -> device limit -> cooldown
 *
 * @returns {{ ok: true, phone: string, deviceId?: string, platform: string }
 *          | { ok: false, statusCode: number, error: string }}
 */
async function enforceRequestSecurity(req) {
  const body = req.body || {};

  const platformCheck = validatePlatform(body.platform);
  if (!platformCheck.valid) {
    return { ok: false, statusCode: platformCheck.statusCode, error: platformCheck.message };
  }

  const phoneCheck = normalizePhone(body.phoneNumber);
  if (!phoneCheck.valid) {
    return { ok: false, statusCode: 400, error: phoneCheck.message };
  }

  const platformSecurity = await applyPlatformSecurity({
    req,
    body,
    operation: "request",
    phone: phoneCheck.phone,
  });
  if (!platformSecurity.ok) {
    return {
      ok: false,
      statusCode: platformSecurity.statusCode,
      error: platformSecurity.error,
      platform: body.platform,
    };
  }

  const rateResult = await applyRequestLimits({
    ip: req.ip,
    phone: phoneCheck.phone,
    deviceId: platformSecurity.deviceId,
  });
  if (!rateResult.allowed) {
    return {
      ok: false,
      statusCode: 429,
      error: "Too many requests. Please try again later.",
      retryAfterSec: rateResult.retryAfterSec,
      platform: body.platform,
    };
  }

  return {
    ok: true,
    phone: phoneCheck.phone,
    deviceId: platformSecurity.deviceId,
    platform: body.platform,
  };
}

/**
 * Enforce the security order for OTP *verification*, including brute-force
 * attempt limits.
 */
async function enforceVerifySecurity(req) {
  const body = req.body || {};

  const platformCheck = validatePlatform(body.platform);
  if (!platformCheck.valid) {
    return { ok: false, statusCode: platformCheck.statusCode, error: platformCheck.message };
  }

  const phoneCheck = normalizePhone(body.phoneNumber);
  if (!phoneCheck.valid) {
    return { ok: false, statusCode: 400, error: phoneCheck.message };
  }

  const platformSecurity = await applyPlatformSecurity({
    req,
    body,
    operation: "verify",
    phone: phoneCheck.phone,
  });
  if (!platformSecurity.ok) {
    return {
      ok: false,
      statusCode: platformSecurity.statusCode,
      error: platformSecurity.error,
      platform: body.platform,
    };
  }

  const rateResult = await applyVerifyLimits({
    ip: req.ip,
    phone: phoneCheck.phone,
    deviceId: platformSecurity.deviceId,
  });
  if (!rateResult.allowed) {
    return {
      ok: false,
      statusCode: 429,
      error: "Too many verification attempts. Please try again later.",
      retryAfterSec: rateResult.retryAfterSec,
      platform: body.platform,
    };
  }

  return {
    ok: true,
    phone: phoneCheck.phone,
    deviceId: platformSecurity.deviceId,
    platform: body.platform,
  };
}

module.exports = {
  applyPlatformSecurity,
  enforceRequestSecurity,
  enforceVerifySecurity,
};