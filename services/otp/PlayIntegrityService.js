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
    console.debug(
      `[PlayIntegrity] express decode failed${status ? ` HTTP ${status}` : ""}: ${(e && e.message) || e}`
    );
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
    console.debug("[PlayIntegrity] integrity_token_required — token is empty or not a string");
    return { verified: false, statusCode: 400, reason: "integrity_token_required" };
  }

  // Defensive trim: clients sometimes ship the JWS with a trailing newline
  // or leading/trailing whitespace (e.g. from a file copy or log scraping).
  const rawToken = token;
  token = token.trim();
  if (token.length !== rawToken.length) {
    console.debug(`[PlayIntegrity] token trimmed ${rawToken.length - token.length} char(s)`);
  }

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
    console.debug(
      "[PlayIntegrity] non-JWS token — attempting detection ",
      JSON.stringify({
        tokenLength: token.length,
        dotCount,
        partsCount: parts.length,
        startsWithBrace: looksJson,
        looksLikeBase64: looksB64,
        preview,
      })
    );

    // If the token is opaque and Google verification is configured, treat it
    // as an Express integrity token and verify it server-side.
    if (!looksJson && loadServiceAccount()) {
      console.debug("[PlayIntegrity] routing to Express server-side verification");
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

  if (nonce) {
    console.debug(`[PlayIntegrity] nonce len=${nonce.length} hash=${requestHashFromNonce(nonce).slice(0, 16)}…`);
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
function evaluateVerdict(verdict, { nonce, express = false }) {
  const requestDetails = verdict.requestDetails || {};
  if (requestDetails.requestHash) {
    // The Flutter client computes:
    //   requestHash = base64url( SHA-256( UTF-8(nonce) ) )
    // and the decoded payload echoes that exact requestHash back. We recompute
    // the same value (requestHashFromNonce hashes the UTF-8 nonce string) and
    // compare — this holds for both Standard (JWS) and Express (opaque) tokens.
    const expected = normalizeRequestHash(requestHashFromNonce(nonce));
    const actual = normalizeRequestHash(requestDetails.requestHash);
    if (expected && expected !== actual) {
      // Unexpected. The client ought to have computed
      //   requestHash = base64url( SHA-256( UTF-8(nonce) ) )
      // i.e. the `expected` value below. If `actual` doesn't match, the app
      // probably derived its requestHash from a different nonce/encoding. Show
      // candidate derivations (hashes are one-way, safe to log) for diagnosis:
      //   1) sha256(utf8(nonceString))          base64url -> expected (correct)
      //   2) sha256(decodedNonceBytes)          base64url
      //   3) sha256(decodedNonceBytes)          standard base64
      //   4) raw nonce passed as requestHash
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
      console.debug(
        `[PlayIntegrity] request_binding_mismatch — expected=${expected} actual=${actual}\n` +
          `  nonce=${nonce}\n` +
          `  candidates=${JSON.stringify(candidates, null, 2)}`
      );
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