const crypto = require("crypto");
const config = require("./config");
const { verifyEcdsaSignature, verifyCertificateChain } = require("./cryptoHelpers");
const { getRedisClient } = require("../redisClient");
const { GTS_ROOTS } = require("./gtsRoots");

// Injectable for tests (defaults to the real Redis client).
let replayClientGetter = getRedisClient;

function _setReplayClientForTest(fn) {
  replayClientGetter = fn;
  return () => { replayClientGetter = getRedisClient; };
}

function b64urlEncode(buf) {
  return Buffer.from(buf).toString("base64url");
}

function b64urlDecode(str) {
  return Buffer.from(String(str).replace(/=+$/, ""), "base64url");
}

/**
 * Derive the AES-GCM payload decryption key from the signing certificate's
 * EC public key: key = SHA256( 0x04 || X || Y ).
 */
function deriveAesKey(publicKey) {
  const jwk = publicKey.export({ format: "jwk" });
  const x = Buffer.from(jwk.x, "base64");
  const y = Buffer.from(jwk.y, "base64");
  const point = Buffer.concat([Buffer.from([0x04]), x, y]);
  return crypto.createHash("sha256").update(point).digest();
}

/**
 * Try to decrypt the Play Integrity payload using AES-256-GCM.
 *
 * Supports the two documented packet layouts so that real Google-produced
 * tokens decrypt regardless of the exact prefix:
 *   - Layout A (no prefix):     nonce(12) || ciphertext || tag(16)
 *   - Layout B (4-byte prefix): prefix(4) || nonce(12) || ciphertext || tag(16)
 *
 * GCM authentication guarantees correctness, so only the intended layout
 * succeeds.
 */
function decryptPayload(payload, key) {
  const candidates = [];
  if (payload.length > 12 + 16) candidates.push(payload);
  if (payload.length > 4 + 12 + 16) candidates.push(payload.subarray(4));

  for (const buf of candidates) {
    try {
      const nonce = buf.subarray(0, 12);
      const ciphertextAndTag = buf.subarray(12);
      const tag = ciphertextAndTag.subarray(ciphertextAndTag.length - 16);
      const ciphertext = ciphertextAndTag.subarray(0, ciphertextAndTag.length - 16);
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      const parsed = JSON.parse(decrypted.toString("utf8"));
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {
      // GCM auth failure -> wrong layout/key; try the other candidate.
    }
  }
  return null;
}

/**
 * Atomic Redis SET NX guard used to reject replayed integrity tokens.
 * Returns true when the request hash was already seen (replay).
 */
async function rejectIfReplayed(requestHash) {
  try {
    const client = await replayClientGetter();
    const key = `otp:integrity:replay:${requestHash}`;
    const set = await client.set(key, "1", { EX: config.OTP_INTEGRITY_REPLAY_WINDOW_SECONDS, NX: true });
    return set === null;
  } catch (e) {
    return true; // fail closed
  }
}

function normalizeRequestHash(hash) {
  if (!hash) return "";
  return hash.includes("+") || hash.includes("/")
    ? hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    : hash;
}

function requestHashFromNonce(nonce) {
  if (!nonce) return "";
  try {
    const bytes = b64urlDecode(nonce);
    return b64urlEncode(crypto.createHash("sha256").update(bytes).digest());
  } catch (e) {
    return "";
  }
}

/**
 * Verify a Play Integrity response token (JWS: Header.Payload.Signature).
 *
 * @param {object} params
 * @param {string} params.token - integrity token from the client
 * @param {string} [params.nonce] - base64url nonce the client used
 * @returns {Promise<{ verified: boolean, statusCode?: number, reason?: string, requestHash?: string }>}
 */
async function verifyIntegrityToken({ token, nonce }) {
  if (!token || typeof token !== "string") {
    return { verified: false, statusCode: 400, reason: "integrity_token_required" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { verified: false, statusCode: 400, reason: "malformed_integrity_token" };
  }
  const [headerB64, payloadB64, sigB64] = parts;

  let header;
  try {
    header = JSON.parse(b64urlDecode(headerB64).toString("utf8"));
  } catch (e) {
    return { verified: false, statusCode: 400, reason: "malformed_integrity_header" };
  }

  if (header.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.length === 0) {
    return { verified: false, statusCode: 400, reason: "invalid_integrity_header" };
  }

  let certs;
  try {
    certs = header.x5c.map((derB64) => new crypto.X509Certificate(Buffer.from(derB64, "base64")));
  } catch (e) {
    return { verified: false, statusCode: 400, reason: "invalid_certificate_chain" };
  }

  const chain = verifyCertificateChain(certs, GTS_ROOTS);
  if (!chain.valid) {
    return { verified: false, statusCode: 403, reason: `untrusted_chain:${chain.reason}` };
  }

  const leaf = certs[0];
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, "utf8");
  const signature = b64urlDecode(sigB64);
  const key = crypto.createPublicKey({ key: leaf.raw, format: "der", type: "spki" });
  const sigValid = verifyEcdsaSignature(signingInput, signature, key, "ieee-p1363");
  if (!sigValid) {
    return { verified: false, statusCode: 403, reason: "invalid_signature" };
  }

  const aesKey = deriveAesKey(key);
  const verdict = decryptPayload(b64urlDecode(payloadB64), aesKey);
  if (!verdict) {
    return { verified: false, statusCode: 403, reason: "payload_decryption_failed" };
  }

  const result = evaluateVerdict(verdict, { nonce });
  if (!result.verified) return result;

  const requestHash = (verdict.requestDetails && verdict.requestDetails.requestHash) || "";
  if (requestHash) {
    const replayed = await rejectIfReplayed(normalizeRequestHash(requestHash));
    if (replayed) {
      return { verified: false, statusCode: 403, reason: "replayed_token" };
    }
  }

  return result;
}

/** Evaluate the decrypted verdict against configured security policy. */
function evaluateVerdict(verdict, { nonce }) {
  const requestDetails = verdict.requestDetails || {};
  if (requestDetails.requestHash) {
    const expected = normalizeRequestHash(requestHashFromNonce(nonce));
    if (expected && expected !== normalizeRequestHash(requestDetails.requestHash)) {
      return { verified: false, statusCode: 403, reason: "request_binding_mismatch" };
    }
  }

  const appIntegrity = verdict.appIntegrity || verdict.appIntegrityVerdict || {};
  const tokenVerification = verdict.tokenVerification || {};

  const appRecognition = appIntegrity.appRecognitionVerdict || appIntegrity.verdict || "";
  const tokenVerdict = tokenVerification.verdict || "";

  const strongVerified =
    tokenVerdict === "MEETS_DEVICE_AND_APP_LEVEL_CHECKS" ||
    tokenVerdict === "MEETS_STRONG_INTEGRITY" ||
    appRecognition === "PLAY_RECOGNIZED" ||
    appRecognition === "UNRECOGNIZED_VERSION";

  if (!strongVerified) {
    return { verified: false, statusCode: 403, reason: "unacceptable_integrity_verdict" };
  }

  const deviceIntegrity = verdict.deviceIntegrity || {};
  const deviceVerdicts = Array.isArray(deviceIntegrity.deviceRecognitionVerdict)
    ? deviceIntegrity.deviceRecognitionVerdict
    : deviceIntegrity.deviceRecognitionVerdict
    ? [deviceIntegrity.deviceRecognitionVerdict]
    : [];
  if (
    deviceVerdicts.length &&
    !deviceVerdicts.some(
      (v) => v === "MEETS_DEVICE_AND_APP_LEVEL_CHECKS" || v === "MEETS_STRONG_INTEGRITY"
    )
  ) {
    return { verified: false, statusCode: 403, reason: "device_integrity_failed" };
  }

  if (appIntegrity.packageName && config.PLAY_INTEGRITY_PACKAGE_NAME) {
    if (appIntegrity.packageName !== config.PLAY_INTEGRITY_PACKAGE_NAME) {
      return { verified: false, statusCode: 403, reason: "package_mismatch" };
    }
  }

  const digests = Array.isArray(appIntegrity.certificateSha256Digest)
    ? appIntegrity.certificateSha256Digest
    : appIntegrity.certificateSha256Digest
    ? [appIntegrity.certificateSha256Digest]
    : [];
  if (
    digests.length &&
    config.PLAY_INTEGRITY_CERTIFICATE_DIGESTS.length &&
    !digests
      .map((d) => d.toUpperCase())
      .some((d) => config.PLAY_INTEGRITY_CERTIFICATE_DIGESTS.includes(d))
  ) {
    return { verified: false, statusCode: 403, reason: "certificate_digest_mismatch" };
  }

  return { verified: true, requestHash: normalizeRequestHash(requestDetails.requestHash || "") };
}

function isEnabled() {
  return config.PLAY_INTEGRITY_ENABLED;
}

function isConfigured() {
  return Boolean(config.PLAY_INTEGRITY_PACKAGE_NAME) && config.PLAY_INTEGRITY_CERTIFICATE_DIGESTS.length > 0;
}

function generateNonce() {
  return b64urlEncode(crypto.randomBytes(32));
}

module.exports = {
  isEnabled,
  isConfigured,
  generateNonce,
  verifyIntegrityToken,
  _deriveAesKey: deriveAesKey,
  _decryptPayload: decryptPayload,
  _evaluateVerdict: evaluateVerdict,
  _setReplayClientForTest,
};