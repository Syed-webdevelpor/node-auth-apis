const crypto = require("crypto");
const cbor = require("cbor");
const { verifyEcdsaSignature, verifyCertificateChain, createEcPublicKeyFromPoint } = require("./cryptoHelpers");

// Authentic Apple App Attestation Root CA (public key only).
const APPLE_APP_ATTEST_ROOT = `-----BEGIN CERTIFICATE-----
MIICITCCAaegAwIBAgIQC/O+DvHN0uD7jG5yH2IXmDAKBggqhkjOPQQDAzBSMSYw
JAYDVQQDDB1BcHBsZSBBcHAgQXR0ZXN0YXRpb24gUm9vdCBDQTETMBEGA1UECgwK
QXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTAeFw0yMDAzMTgxODMyNTNa
Fw00NTAzMTUwMDAwMDBaMFIxJjAkBgNVBAMMHUFwcGxlIEFwcCBBdHRlc3RhdGlv
biBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJbmMuMRMwEQYDVQQIDApDYWxpZm9y
bmlhMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAERTHhmLW07ATaFQIEVwTtT4dyctdh
NbJhFs/Ii2FdCgAHGbpphY3+d8qjuDngIN3WVhQUBHAoMeQ/cLiP1sOUtgjqK9au
Yen1mMEvRq9Sk3Jm5X8U62H+xTD3FE9TgS41o0IwQDAOBgNVHQ8BAf8EBAMCAQYw
DwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUrJEQUzO9vmhB/6cMqeX66uXliqEw
CgYIKoZIzj0EAwMDaAAwZQIwQgFGnByvsiVbpTKwSga0kP0e8EeDS4+sQmTvb7vn
53O5+FRXgeLhpJ06ysC5PrOyAjEAp5U4xDgEgllF7En3VcE3iexZZtKeYnpqtijV
oyFraWVIyd/dganmrduC1bmTBGwD
-----END CERTIFICATE-----`;

// OID 1.2.840.113635.100.8.2 (Apple App Attest credential certificate nonce)
const NONCE_EXTENSION_OID = "1.2.840.113635.100.8.2";

const MIN_AUTH_DATA_LENGTH = 37;
const FLAG_AT = 0x40; // attested credential data present

function toBuf(v) {
  if (!v) return null;
  if (Buffer.isBuffer(v)) return v;
  if (ArrayBuffer.isView(v)) return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
  return null;
}

function parseAuthData(buf) {
  if (buf.length < MIN_AUTH_DATA_LENGTH) throw new Error("auth_data_too_short");
  const rpIdHash = buf.subarray(0, 32);
  const flags = buf[32];
  const counter = buf.readUInt32BE(33);
  let attested = null;
  let offset = MIN_AUTH_DATA_LENGTH;
  // Apple sets the AT flag on assertions too, but does NOT include attested
  // credential data there. Only parse attested data when bytes remain.
  if ((flags & FLAG_AT) && buf.length > MIN_AUTH_DATA_LENGTH) {
    if (buf.length < offset + 18) throw new Error("auth_data_truncated");
    const aaguid = buf.subarray(offset, offset + 16);
    offset += 16;
    const credIdLen = buf.readUInt16BE(offset);
    offset += 2;
    if (buf.length < offset + credIdLen) throw new Error("auth_data_truncated");
    const credId = buf.subarray(offset, offset + credIdLen);
    offset += credIdLen;
    const coseKey = buf.subarray(offset);
    attested = { aaguid, credId, coseKey };
  }
  return { rpIdHash, flags, counter, attested, raw: buf };
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest();
}

function readTLV(buf, start) {
  if (start >= buf.length) return null;
  const tag = buf[start];
  let i = start + 1;
  if (i >= buf.length) return null;
  let len = buf[i];
  i += 1;
  if (len & 0x80) {
    const lenBytes = len & 0x7f;
    if (i + lenBytes > buf.length || lenBytes > 4) return null;
    len = buf.readUIntBE(i, lenBytes);
    i += lenBytes;
  }
  if (i + len > buf.length) return null;
  return { tag, value: buf.subarray(i, i + len), next: i + len };
}

function extractNonceFromExtension(extValue) {
  const outer = readTLV(extValue, 0);
  if (!outer || outer.tag !== 0x30) return null; // SEQUENCE
  const inner = readTLV(outer.value, 0);
  if (!inner || inner.tag !== 0x04) return null; // OCTET STRING
  return inner.value;
}

/**
 * DER-encode an OID's content bytes (1.2.840.113635.100.8.2 style).
 * Returns just the OID content (no tag/length wrapper) so it can be compared
 * against the value of an `OBJECT IDENTIFIER` element read by readTLV.
 */
function encodeOid(oidString) {
  const parts = String(oidString).split(".").map(Number);
  const bytes = [40 * parts[0] + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let n = parts[i];
    const stack = [n & 0x7f];
    n >>= 7;
    while (n > 0) {
      stack.push((n & 0x7f) | 0x80);
      n >>= 7;
    }
    for (let j = stack.length - 1; j >= 0; j--) bytes.push(stack[j]);
  }
  return Buffer.from(bytes);
}

/** Iterate the top-level TLV children of a DER SEQUENCE value. */
function forEachTlv(buf, cb) {
  let offset = 0;
  while (offset < buf.length) {
    const item = readTLV(buf, offset);
    if (!item) return false;
    const stop = cb(item);
    if (stop) return true;
    offset = item.next;
  }
  return false;
}

/**
 * Extract the DER-encoded *value* of a named X.509 extension from a raw DER
 * certificate. `crypto.X509Certificate` has no getExtension(), so we walk the
 * certificate manually:
 *
 *   Certificate ::= SEQUENCE { tbsCertificate, ... }
 *   TBSCertificate ::= SEQUENCE { ..., extensions [3] EXPLICIT Extensions }
 *   Extension ::= SEQUENCE { extnID OID, critical BOOLEAN DEFAULT FALSE,
 *                            extnValue OCTET STRING }
 *
 * We return the content of the `extnValue` OCTET STRING for the matching OID
 * (i.e. the DER encoding of the extension's value), or null if not found.
 */
function extractExtensionValueByOid(certDer, oidString) {
  const oidContent = encodeOid(oidString);

  // Certificate ::= SEQUENCE { tbsCertificate ... }
  const cert = readTLV(certDer, 0);
  if (!cert || cert.tag !== 0x30) return null;

  // TBSCertificate ::= SEQUENCE { ... extensions [3] EXPLICIT Extensions }
  const tbs = readTLV(cert.value, 0);
  if (!tbs || tbs.tag !== 0x30) return null;

  let extensionsValue = null;
  forEachTlv(tbs.value, (item) => {
    if (item.tag === 0xa3) {
      // [3] EXPLICIT -> content is the Extensions SEQUENCE
      extensionsValue = item.value;
      return true;
    }
    return false;
  });
  if (!extensionsValue) return null;

  // Extensions ::= SEQUENCE OF Extension
  const extensions = readTLV(extensionsValue, 0);
  if (!extensions || extensions.tag !== 0x30) return null;

  let foundValue = null;
  forEachTlv(extensions.value, (extItem) => {
    if (extItem.tag !== 0x30) return false; // only Extension SEQUENCEs
    let oid = null;
    let extnValue = null;
    forEachTlv(extItem.value, (field) => {
      if (field.tag === 0x06) {
        if (oid === null) oid = field.value; // first OID is extnID
      } else if (field.tag === 0x04) {
        extnValue = field.value; // extnValue OCTET STRING content
      } else if (field.tag === 0x01) {
        // critical BOOLEAN, skip
      }
      return false;
    });
    if (oid && oid.equals(oidContent) && extnValue) {
      foundValue = extnValue;
      return true;
    }
    return false;
  });

  return foundValue;
}

function expectedAaguid(production) {
  const value = production ? "appattest" : "appattestdevelop";
  const aaguid = Buffer.alloc(16);
  Buffer.from(value, "utf8").copy(aaguid);
  return aaguid;
}

function bufEquals(a, b) {
  return Buffer.isBuffer(a) && Buffer.isBuffer(b) && a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verify an App Attest attestation object (registration).
 *
 * @param {object} args
 * @param {Buffer} args.attestationObject - decoded attestationObject
 * @param {Buffer} args.clientData - raw clientData (JSON)
 * @param {Buffer} args.keyId - decoded key identifier bytes
 * @param {string} args.appId - full Apple App ID `<TeamID>.<BundleID>`
 *                             (e.g. ABCDE12345.com.example.app); its SHA-256
 *                             must equal the authenticator-data rpIdHash
 * @param {boolean} args.production - true for production environment
 * @returns {{ publicKeyPoint: Buffer }}
 */
function verifyAttestation({ attestationObject, clientData, keyId, appId, production }) {
  let dec;
  try {
    dec = cbor.decodeFirstSync(attestationObject);
  } catch (e) {
    throw new Error("invalid_attestation_cbor");
  }
  if (!dec || typeof dec !== "object") throw new Error("invalid_attestation");

  const fmt = dec.fmt;
  const rawAuthData = toBuf(dec.authData);
  const attStmt = dec.attStmt || {};
  if (fmt !== "apple-appattest" || !rawAuthData) throw new Error("invalid_attestation_format");
  if (!Array.isArray(attStmt.x5c) || attStmt.x5c.length === 0) {
    throw new Error("missing_certificate_chain");
  }

  const authData = parseAuthData(rawAuthData);
  if (!authData.attested) throw new Error("missing_attested_credential");

  // Authenticator data bindings.
  const appIdHash = sha256(Buffer.from(appId, "utf8"));
  if (!bufEquals(authData.rpIdHash, appIdHash)) throw new Error("rp_id_hash_mismatch");
  if (authData.counter !== 0) throw new Error("counter_not_zero");
  // TEMPORARY DEBUG LOG — remove after diagnosing invalid_aaguid.
  console.log("App Attest AAGUID debug:", {
    received: authData.attested.aaguid.toString("hex"),
    expected: expectedAaguid(production).toString("hex"),
    production,
    appId,
  });
  if (!bufEquals(authData.attested.aaguid, expectedAaguid(production))) {
    throw new Error("invalid_aaguid");
  }
  if (!bufEquals(authData.attested.credId, keyId)) throw new Error("credential_id_mismatch");

  // Nonce = SHA256( authData || SHA256(clientData) ).
  const clientDataHash = sha256(clientData);
  const nonce = sha256(Buffer.concat([rawAuthData, clientDataHash]));

  // Verify the certificate chain to the Apple App Attestation Root.
  const certs = attStmt.x5c.map((der) => new crypto.X509Certificate(toBuf(der)));
  const chain = verifyCertificateChain(certs, [APPLE_APP_ATTEST_ROOT]);
  if (!chain.valid) throw new Error(`invalid_certificate_chain:${chain.reason}`);

  const credCert = certs[0];

  // Verify the nonce extension in the credential certificate.
  // crypto.X509Certificate has no getExtension(), so extract it manually.
  const extValue = extractExtensionValueByOid(credCert.raw, NONCE_EXTENSION_OID);
  if (!extValue) throw new Error("missing_nonce_extension");
  const nonceFromCert = extractNonceFromExtension(extValue);
  // TEMPORARY DEBUG LOG — remove after diagnosing nonce_mismatch.
  console.log("App Attest nonce debug:", {
    expectedNonce: nonce.toString("hex"),
    certificateNonce: nonceFromCert ? nonceFromCert.toString("hex") : null,
    expectedLength: nonce.length,
    certificateNonceLength: nonceFromCert ? nonceFromCert.length : null,
    extensionValue: extValue.toString("hex"),
  });
  if (!nonceFromCert || !bufEquals(nonceFromCert, nonce)) throw new Error("nonce_mismatch");

  // public key hash must equal the key identifier.
  const pubKeyJwk = credCert.publicKey.export({ format: "jwk" });
  const x = Buffer.from(pubKeyJwk.x, "base64");
  const y = Buffer.from(pubKeyJwk.y, "base64");
  const point = Buffer.concat([Buffer.from([0x04]), x, y]);
  if (!bufEquals(sha256(point), keyId)) throw new Error("public_key_hash_mismatch");

  return { publicKeyPoint: point };
}

/**
 * Verify an App Attest assertion (subsequent OTP requests).
 *
 * @param {object} args
 * @param {Buffer} args.assertion - decoded assertion CBOR
 * @param {Buffer} args.clientData - raw clientData (JSON)
 * @param {Buffer} args.publicKeyPoint - stored x963 public key (04||X||Y)
 * @param {string} args.appId - full Apple App ID `<TeamID>.<BundleID>`;
 *                              SHA-256 of this string must equal rpIdHash
 * @param {number} args.previousCounter - counter from the last verified assertion
 * @returns {{ counter: number }}
 */
function verifyAssertion({ assertion, clientData, publicKeyPoint, appId, previousCounter }) {
  let dec;
  try {
    dec = cbor.decodeFirstSync(assertion);
  } catch (e) {
    throw new Error("invalid_assertion_cbor");
  }
  if (!dec || typeof dec !== "object") throw new Error("invalid_assertion");

  const rawAuthData = toBuf(dec.authenticatorData);
  const signature = toBuf(dec.signature);
  if (!rawAuthData || !signature) throw new Error("invalid_assertion");

  const authData = parseAuthData(rawAuthData);

  // RP ID binding.
  const appIdHash = sha256(Buffer.from(appId, "utf8"));
  if (!bufEquals(authData.rpIdHash, appIdHash)) throw new Error("rp_id_hash_mismatch");

  // Signature over nonce = SHA256( authData || SHA256(clientData) ).
  const clientDataHash = sha256(clientData);
  const nonce = sha256(Buffer.concat([rawAuthData, clientDataHash]));

  const publicKey = createEcPublicKeyFromPoint(publicKeyPoint);
  if (!publicKey) throw new Error("invalid_public_key");
  if (!verifyEcdsaSignature(nonce, signature, publicKey, "der")) {
    throw new Error("invalid_signature");
  }

  // Counter replay/rollback protection.
  if (authData.counter <= previousCounter) throw new Error("counter_rollback_or_replay");

  return { counter: authData.counter };
}

module.exports = {
  verifyAttestation,
  verifyAssertion,
  APPLE_APP_ATTEST_ROOT,
};