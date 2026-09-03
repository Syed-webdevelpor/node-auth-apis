const crypto = require("crypto");
const config = require("./config");
const { verifyAttestation, verifyAssertion } = require("./appAttestCrypto");
const repo = require("./appAttestRepository");
const { getRedisClient } = require("../redisClient");
const { logSecurity } = require("./securityLogger");

function isEnabled() {
  return config.APP_ATTEST_ENABLED;
}

function isConfigured() {
  if (!config.APP_ATTEST_APP_ID) return false;
  if (config.APP_ATTEST_ENVIRONMENT !== "production" && config.APP_ATTEST_ENVIRONMENT !== "development") {
    return false;
  }
  return true;
}

function isProduction() {
  return config.APP_ATTEST_ENVIRONMENT !== "development";
}

function b64urlDecode(str) {
  try {
    return Buffer.from(String(str).replace(/=+$/, ""), "base64url");
  } catch (e) {
    return null;
  }
}

function b64urlEncode(buf) {
  return Buffer.from(buf).toString("base64url");
}

async function generateChallenge() {
  const challenge = b64urlEncode(crypto.randomBytes(32));
  try {
    const client = await getRedisClient();
    await client.set(`otp:appattest:challenge:${challenge}`, "1", {
      EX: config.OTP_CHALLENGE_TTL_SECONDS,
    });
  } catch (e) {
    // Challenge still returned; consumed server-side at verification time.
  }
  return challenge;
}

/** Consume a challenge (single-use). Returns true when it was valid & unused. */
async function consumeChallenge(challenge) {
  if (!challenge) return false;
  try {
    const client = await getRedisClient();
    const key = `otp:appattest:challenge:${challenge}`;
    if (typeof client.getDel === "function") {
      const val = await client.getDel(key);
      return val !== null;
    }
    const val = await client.get(key);
    if (val === null) return false;
    await client.del(key);
    return true;
  } catch (e) {
    return false; // fail closed
  }
}

function parseClientDataChallenge(clientDataBuf) {
  try {
    const parsed = JSON.parse(clientDataBuf.toString("utf8"));
    return parsed && parsed.challenge ? String(parsed.challenge) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Register (verify) an App Attest attestation and persist the public key.
 */
async function register({ keyId, attestationObjectB64, clientDataB64, challenge, phoneNumber, userId }) {
  if (!keyId || !attestationObjectB64 || !clientDataB64) {
    return { success: false, statusCode: 400, reason: "missing_attestation_fields" };
  }

  const keyIdRaw = b64urlDecode(keyId);
  const attestationObject = b64urlDecode(attestationObjectB64);
  const clientData = b64urlDecode(clientDataB64);
  if (!keyIdRaw || !attestationObject || !clientData) {
    return { success: false, statusCode: 400, reason: "invalid_encoding" };
  }

  // One-time challenge binding.
  if (!(await consumeChallenge(challenge))) {
    return { success: false, statusCode: 403, reason: "invalid_or_used_challenge" };
  }
  if (parseClientDataChallenge(clientData) !== challenge) {
    return { success: false, statusCode: 403, reason: "challenge_mismatch" };
  }

  let result;
  try {
    result = verifyAttestation({
      attestationObject,
      clientData,
      keyId: keyIdRaw,
      appId: config.APP_ATTEST_APP_ID,
      production: isProduction(),
    });
  } catch (e) {
    logSecurity({ platform: "ios", operation: "appattest_register", result: "block", reason: e.message });
    return { success: false, statusCode: 403, reason: `attestation_failed:${e.message}` };
  }

  try {
    await repo.createRegistration({
      keyId,
      publicKeyBase64: result.publicKeyPoint.toString("base64"),
      counter: 0,
      phoneNumber: phoneNumber || null,
      userId: userId || null,
      environment: config.APP_ATTEST_ENVIRONMENT,
    });
  } catch (e) {
    return { success: false, statusCode: 500, reason: "persistence_failed" };
  }

  logSecurity({ platform: "ios", operation: "appattest_register", result: "pass", reason: "ok" });
  return { success: true, keyId };
}

/**
 * Verify an App Attest assertion for a previously registered key.
 */
async function verifyDevice({ keyId, assertionB64, clientDataB64, challenge, phoneNumber }) {
  if (!keyId || !assertionB64 || !clientDataB64) {
    return { success: false, statusCode: 400, reason: "missing_assertion_fields" };
  }

  const assertion = b64urlDecode(assertionB64);
  const clientData = b64urlDecode(clientDataB64);
  if (!assertion || !clientData) {
    return { success: false, statusCode: 400, reason: "invalid_encoding" };
  }

  const stored = await repo.findByKeyId(keyId);
  if (!stored) {
    return { success: false, statusCode: 403, reason: "unknown_key_id" };
  }
  if (stored.environment !== config.APP_ATTEST_ENVIRONMENT) {
    return { success: false, statusCode: 403, reason: "environment_mismatch" };
  }
  if (phoneNumber && stored.phoneNumber && stored.phoneNumber !== phoneNumber) {
    return { success: false, statusCode: 403, reason: "device_phone_mismatch" };
  }

  // One-time challenge binding.
  if (!(await consumeChallenge(challenge))) {
    return { success: false, statusCode: 403, reason: "invalid_or_used_challenge" };
  }
  if (parseClientDataChallenge(clientData) !== challenge) {
    return { success: false, statusCode: 403, reason: "challenge_mismatch" };
  }

  let counter;
  try {
    const publicKeyPoint = Buffer.from(stored.publicKey, "base64");
    const verified = verifyAssertion({
      assertion,
      clientData,
      publicKeyPoint,
      appId: config.APP_ATTEST_APP_ID,
      previousCounter: stored.counter,
    });
    counter = verified.counter;
  } catch (e) {
    logSecurity({ platform: "ios", operation: "appattest_assert", result: "block", reason: e.message });
    return { success: false, statusCode: 403, reason: `assertion_failed:${e.message}` };
  }

  try {
    await repo.updateCounter(keyId, counter);
  } catch (e) {
    return { success: false, statusCode: 500, reason: "persistence_failed" };
  }

  logSecurity({ platform: "ios", operation: "appattest_assert", result: "pass", reason: "ok" });
  return { success: true, keyId };
}

module.exports = {
  isEnabled,
  isConfigured,
  isProduction,
  generateChallenge,
  register,
  verifyDevice,
};