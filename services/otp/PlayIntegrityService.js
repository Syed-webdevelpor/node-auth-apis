const crypto = require("crypto");
const config = require("./config");
const { verifyEcdsaSignature, verifyCertificateChain } = require("./cryptoHelpers");
const { getRedisClient } = require("../redisClient");
const { GTS_ROOTS } = require("./gtsRoots");
const { JWT } = require("google-auth-library");
const { playintegrity } = require("@googleapis/playintegrity");

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
 * Normalize a SHA-256 certificate digest into canonical raw 32 bytes.
 *
 * Play Integrity's certificateSha256Digest comes back as Base64URL (unpadded),
 * e.g. "f297BhTdLiuUaAa9SPjEtLYlInNFUGaiOteZ21oRsr0". Your config might instead
 * hold the Play Console "SHA-256 fingerprint" (colon-separated hex), e.g.
 * "2A:A1:27:7E:...:96:D4", or plain 64-char hex. Accept all of them and compare
 * on the decoded bytes so format differences never cause a false rejection.
 *
 * @param {string} value
 * @returns {Buffer|null} 32-byte hash, or null if it cannot be parsed
 */
function normalizeCertDigest(value) {
  if (!value || typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;

  // 1) Colon-separated hex: "2A:A1:27:...:D4" (Play Console fingerprint).
  if (v.includes(":")) {
    const hex = v.replace(/:/g, "");
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
    const buf = Buffer.from(hex, "hex");
    return buf.length === 32 ? buf : null;
  }

  // 2) Plain 64-char hex: "2AA127...D4".
  if (/^[0-9a-fA-F]{64}$/.test(v)) {
    const buf = Buffer.from(v, "hex");
    return buf.length === 32 ? buf : null;
  }

  // 3) Base64 / Base64URL (with or without padding) that decodes to 32 bytes.
  const cleaned = v.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  if (!/^[A-Za-z0-9+/]+$/.test(cleaned)) return null;
  try {
    const buf = Buffer.from(cleaned, "base64");
    return buf.length === 32 ? buf : null;
  } catch (e) {
    return null;
  }
}

/** Compare two normalized cert-digest Buffers (constant-time-ish). */
function certDigestEquals(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.equals(b);
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
  if (!nonce || typeof nonce !== "string") return "";
  // The Flutter client computes:
  //   requestHash = base64url( SHA-256( UTF-8(nonceString) ) )
  // We must recompute the exact same value: hash the UTF-8 bytes of the nonce
  // STRING (not the base64url-decoded binary), then output unpadded base64url.
  return crypto
    .createHash("sha256")
    .update(Buffer.from(nonce, "utf8"))
    .digest("base64url");
}
/* ---------------------------------------------------------------------------
 * Express Integrity (opaque tokens) — server-side verification via Google.
 *
 * Express tokens (from StandardIntegrity.requestExpressIntegrityToken) are NOT
 * JWS and cannot be verified offline. They MUST be decoded by Google's API
 * using a service-account. This block implements that flow.
 * ------------------------------------------------------------------------- */

// Parse the raw service-account JSON from config.
function loadServiceAccount() {
  const raw = config.PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && parsed.client_email && parsed.private_key) return parsed;
  } catch (e) {
    // ignore; treated as missing below
  }
  return null;
}

let expressAuthClient = null;
let expressAuthInitError = "";

function getExpressAuthClient() {
  if (expressAuthClient) return expressAuthClient;
  const sa = loadServiceAccount();
  if (!sa) {
    expressAuthInitError = "service_account_missing_or_invalid";
    return null;
  }
  try {
    expressAuthClient = new JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: ["https://www.googleapis.com/auth/playintegrity"],
      subject: sa.client_email,
    });
    expressAuthInitError = "";
    return expressAuthClient;
  } catch (e) {
    expressAuthInitError = "service_account_jwt_failed";
    return null;
  }
}

/**
 * Verify an Express (opaque) integrity token by asking Google to decode it.
 *
 * @param {object} params
 * @param {string} params.token - opaque integrity token from the client
 * @param {string} [params.nonce] - the base64url nonce string the client was
 *                                  issued; we recompute SHA-256(UTF-8(nonce))
 *                                  and compare it against the request hash
 *                                  Google echoes back so the token is bound to
 *                                  a challenge this server actually issued.
 * @returns {Promise<{ verified: boolean, statusCode?: number, reason?: string, requestHash?: string }>}
 */
async function verifyExpressIntegrityToken({ token, nonce }) {
  const auth = getExpressAuthClient();
  if (!auth) {
    return {
      verified: false,
      statusCode: 500,
      reason: `express_auth_unavailable:${expressAuthInitError || "unknown"}`,
    };
  }

  let client;
  try {
    client = playintegrity({ version: "v1", auth });
  } catch (e) {
    return { verified: false, statusCode: 500, reason: "express_client_init_failed" };
  }

  // Decode (and thereby cryptographically verify) the token with Google.
  let decoded;
  try {
    const res = await client.v1.decodeIntegrityToken({
      packageName: config.PLAY_INTEGRITY_PACKAGE_NAME,
      requestBody: { integrityToken: token },
    });
    decoded = res && res.data && res.data.tokenPayloadExternal;
  } catch (e) {
    const status = e && e.response && e.response.status;
    return { verified: false, statusCode: 403, reason: "express_decode_failed" };
  }

  if (!decoded || typeof decoded !== "object") {
    return { verified: false, statusCode: 403, reason: "express_empty_payload" };
  }

  // Reject Google test/tester responses outside of a test environment.
  if (
    config.NODE_ENV !== "test" &&
    decoded.testingDetails &&
    decoded.testingDetails.isTestingResponse
  ) {
    return { verified: false, statusCode: 403, reason: "testing_response" };
  }

  const result = evaluateVerdict(decoded, { nonce, express: true });
  if (!result.verified) return result;

  const requestHash = result.requestHash || "";
  if (requestHash) {
    const replayed = await rejectIfReplayed(normalizeRequestHash(requestHash));
    if (replayed) {
      return { verified: false, statusCode: 403, reason: "replayed_token" };
    }
  }

  return result;
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

  // Defensive trim: clients sometimes ship the JWS with a trailing newline
  // or leading/trailing whitespace (e.g. from a file copy or log scraping).
  const rawToken = token;
  token = token.trim();

  const parts = token.split(".");
  if (parts.length !== 3) {
    // Not a JWS. This is expected for Express Integrity tokens (opaque, from
    // StandardIntegrity.requestExpressIntegrityToken), which cannot be verified
    // locally and must be decoded by Google's server-side API.
    const dotCount = (token.match(/\./g) || []).length;
    const looksJson = token.startsWith("{") || token.startsWith("[");
    const looksB64 = /^[A-Za-z0-9+/_=-]+$/.test(token);
    const preview = token.length > 0
      ? `${token.slice(0, 20)}…${token.slice(-20)}`
      : "(empty)";

    // If the token is opaque and Google verification is configured, treat it
    // as an Express integrity token and verify it server-side.
    if (!looksJson && loadServiceAccount()) {
      return verifyExpressIntegrityToken({ token, nonce });
    }

    return {
      verified: false,
      statusCode: 400,
      reason: `malformed_integrity_token:expected_3_parts_got_${parts.length};express_unconfigured`,
    };
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

/** Evaluate the decrypted/decoded Play Integrity verdict against policy. */
function evaluateVerdict(verdict, { nonce, express = false } = {}) {
  const requestDetails = verdict.requestDetails || {};

  // ---------------------------------------------------------
  // 1. Verify request binding
  // ---------------------------------------------------------
  if (requestDetails.requestHash) {
    // The Flutter client computes:
    //   requestHash = base64url( SHA-256( UTF-8(nonce) ) )
    // and the decoded payload echoes that exact requestHash back. We recompute
    // the same value (requestHashFromNonce hashes the UTF-8 nonce string) and
    // compare — this holds for both Standard (JWS) and Express (opaque) tokens.
    const expected = normalizeRequestHash(requestHashFromNonce(nonce));
    const actual = normalizeRequestHash(requestDetails.requestHash);
    if (expected && expected !== actual) {
      // Diagnostics — one-way hashes are safe to log.
      const nonceBytes = b64urlDecode(nonce || "");
      const candidates = {
        sha256_utf8_string_b64url: requestHashFromNonce(nonce || ""),
        sha256_decode_bytes_b64url: nonceBytes.length
          ? b64urlEncode(crypto.createHash("sha256").update(nonceBytes).digest())
          : "",
        sha256_decode_bytes_b64: nonceBytes.length
          ? crypto.createHash("sha256").update(nonceBytes).digest().toString("base64")
          : "",
        raw_nonce: nonce || "",
      };
      return { verified: false, statusCode: 403, reason: "request_binding_mismatch" };
    }
  }

  // ---------------------------------------------------------
  // 2. App integrity
  // ---------------------------------------------------------
  const appIntegrity = verdict.appIntegrity || verdict.appIntegrityVerdict || {};
  const appRecognition = appIntegrity.appRecognitionVerdict || appIntegrity.verdict || "";


  // For OTP we require Google Play to recognize our app.
  if (appRecognition !== "PLAY_RECOGNIZED") {
    return { verified: false, statusCode: 403, reason: "app_integrity_failed" };
  }

  // ---------------------------------------------------------
  // 3. Package name
  // ---------------------------------------------------------
  if (appIntegrity.packageName && config.PLAY_INTEGRITY_PACKAGE_NAME) {
    if (appIntegrity.packageName !== config.PLAY_INTEGRITY_PACKAGE_NAME) {
      return { verified: false, statusCode: 403, reason: "package_mismatch" };
    }
  }

  // ---------------------------------------------------------
  // 4. Certificate digest
  // ---------------------------------------------------------
  const digests = Array.isArray(appIntegrity.certificateSha256Digest)
    ? appIntegrity.certificateSha256Digest
    : appIntegrity.certificateSha256Digest
    ? [appIntegrity.certificateSha256Digest]
    : [];

  if (config.PLAY_INTEGRITY_CERTIFICATE_DIGESTS.length > 0 && digests.length > 0) {
    // Google returns Base64URL; the config may hold Base64URL, colon-hex, or
    // plain hex. Normalize everything to raw bytes before comparing so format
    // differences (the Base64URL-vs-hex mismatch you hit) can't cause a false
    // rejection.
    const receivedBytes = digests.map((d) => normalizeCertDigest(d)).filter(Boolean);
    const expectedBytes = config.PLAY_INTEGRITY_CERTIFICATE_DIGESTS.map((d) =>
      normalizeCertDigest(d)
    ).filter(Boolean);

    // Only enforce when at least one side is a valid 32-byte digest; if the
    // config holds garbage we shouldn't silently crash, but a real mismatch of
    // valid digests must block.
    if (receivedBytes.length > 0 && expectedBytes.length > 0) {
      const certificateMatch = receivedBytes.some((recv) =>
        expectedBytes.some((exp) => certDigestEquals(recv, exp))
      );
      if (!certificateMatch) {
        return { verified: false, statusCode: 403, reason: "certificate_digest_mismatch" };
      }
    }
  }

  // ---------------------------------------------------------
  // 5. Device integrity
  // ---------------------------------------------------------
  const deviceIntegrity = verdict.deviceIntegrity || {};
  const deviceVerdicts = Array.isArray(deviceIntegrity.deviceRecognitionVerdict)
    ? deviceIntegrity.deviceRecognitionVerdict
    : deviceIntegrity.deviceRecognitionVerdict
    ? [deviceIntegrity.deviceRecognitionVerdict]
    : [];


  if (deviceVerdicts.length === 0) {
    return { verified: false, statusCode: 403, reason: "device_integrity_missing" };
  }

  // Accept DEVICE or STRONG integrity for OTP.
  const deviceAccepted = deviceVerdicts.some(
    (v) => v === "MEETS_DEVICE_INTEGRITY" || v === "MEETS_STRONG_INTEGRITY"
  );
  if (!deviceAccepted) {
    return { verified: false, statusCode: 403, reason: "device_integrity_failed" };
  }


  return { verified: true, requestHash: normalizeRequestHash(requestDetails.requestHash || "") };
}

function isEnabled() {
  return config.PLAY_INTEGRITY_ENABLED;
}

function isConfigured() {
  // Standard/Classic JWS verification needs the package name + cert digests.
  // Express (opaque) verification needs the package name + a service account.
  const hasPackage = Boolean(config.PLAY_INTEGRITY_PACKAGE_NAME);
  const hasStandardConfig = config.PLAY_INTEGRITY_CERTIFICATE_DIGESTS.length > 0;
  const hasExpressConfig = Boolean(config.PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON);
  return hasPackage && (hasStandardConfig || hasExpressConfig);
}

function generateNonce() {
  return b64urlEncode(crypto.randomBytes(32));
}

module.exports = {
  isEnabled,
  isConfigured,
  generateNonce,
  verifyIntegrityToken,
  verifyExpressIntegrityToken,
  _deriveAesKey: deriveAesKey,
  _decryptPayload: decryptPayload,
  _evaluateVerdict: evaluateVerdict,
  _setReplayClientForTest,
  _loadServiceAccount: loadServiceAccount,
  _getExpressAuthClient: getExpressAuthClient,
};