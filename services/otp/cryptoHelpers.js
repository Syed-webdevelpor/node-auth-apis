const crypto = require("crypto");

// DER SubjectPublicKeyInfo prefix for an ECDSA P-256 public key
// (AlgorithmIdentifier: id-ecPublicKey + prime256v1) followed by the
// uncompressed EC point.
const P256_SPKI_PREFIX = Buffer.from(
  "3059301306072a8648ce3d020106082a8648ce3d030107034200",
  "hex"
);

/**
 * Build an SPKI PublicKeyObject for a P-256 EC point (0x04 || X || Y).
 *
 * @param {Buffer} point
 */
function createEcPublicKeyFromPoint(point) {
  const spki = Buffer.concat([P256_SPKI_PREFIX, point]);
  try {
    return crypto.createPublicKey({ key: spki, format: "der", type: "spki" });
  } catch (e) {
    return null;
  }
}

/**
 * Create an SPKI PEM string from an uncompressed P-256 EC point.
 *
 * @param {Buffer} point
 */
function ecPublicKeyToPem(point) {
  return createEcPublicKeyFromPoint(point).export({ type: "spki", format: "pem" });
}

/**
 * Verify an ECDSA (SHA-256) signature.
 *
 * @param {Buffer} data - data that was signed
 * @param {Buffer} signature - DER-encoded signature (App Attest), or raw
 *                             IEEE-P1363 R||S (Play Integrity) when encoding is
 *                             "ieee-p1363"
 * @param {crypto.KeyObject} publicKey
 * @param {"der"|"ieee-p1363"} encoding - input signature encoding
 */
function verifyEcdsaSignature(data, signature, publicKey, encoding = "der") {
  try {
    const sig = encoding === "ieee-p1363" ? rawEcdsaToDer(signature) : signature;
    return crypto.verify("sha256", data, publicKey, sig);
  } catch (e) {
    return false;
  }
}

/**
 * Convert a raw IEEE-P1363 ECDSA signature (R || S, 32 bytes each) to DER
 * ECDSA-Sig-Value (SEQUENCE { INTEGER r, INTEGER s }).
 */
function rawEcdsaToDer(sig) {
  if (!Buffer.isBuffer(sig) || sig.length !== 64) {
    throw new Error("invalid_raw_signature");
  }
  return encodeSequence([encodeInteger(paddedUnsigned(sig.subarray(0, 32))), encodeInteger(paddedUnsigned(sig.subarray(32, 64)))]);
}

function paddedUnsigned(buf) {
  // Trim leading zero bytes; keep at least one byte.
  let i = 0;
  while (i < buf.length - 1 && buf[i] === 0) i++;
  return buf.subarray(i);
}

function encodeInteger(unsigned) {
  let b = Buffer.from(unsigned);
  if (b.length === 0) b = Buffer.from([0]);
  if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0]), b]); // keep positive
  return encodeTLV(0x02, b);
}

function encodeSequence(items) {
  return encodeTLV(0x30, Buffer.concat(items));
}

function encodeTLV(tag, value) {
  const len = value.length;
  let lenBytes;
  if (len < 0x80) {
    lenBytes = Buffer.from([len]);
  } else {
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(len, 0);
    const trimmed = lenBuf.subarray(lenBuf.findIndex((b) => b !== 0));
    lenBytes = Buffer.concat([Buffer.from([0x80 | trimmed.length]), trimmed]);
  }
  return Buffer.concat([Buffer.from([tag]), lenBytes, value]);
}

/**
 * Verify a certificate chain against a set of trusted root certificates.
 *
 * `certs` is ordered leaf -> ... -> intermediate (the x5c array). At least one
 * cert in the chain must be directly signed by one of the provided roots, and
 * each child must be issued by the next certificate in the list.
 *
 * @param {crypto.X509Certificate[]} certs - leaf first
 * @param {Buffer[]} rootPemList - trusted roots
 * @returns {{ valid: boolean, reason?: string }}
 */
function verifyCertificateChain(certs, rootPemList) {
  if (!Array.isArray(certs) || certs.length === 0) {
    return { valid: false, reason: "empty_chain" };
  }

  const now = new Date();

  for (const cert of certs) {
    if (now < cert.validFrom || now > cert.validTo) {
      return { valid: false, reason: "cert_expired_or_not_yet_valid" };
    }
  }

  const roots = rootPemList.map((pem) => new crypto.X509Certificate(pem));

  // Verify internal signatures: cert[i] issued by cert[i+1].
  for (let i = 0; i < certs.length - 1; i++) {
    const child = certs[i];
    const parent = certs[i + 1];
    try {
      if (!child.checkIssued(parent) || !child.verify(parent.publicKey)) {
        return { valid: false, reason: "chain_broken" };
      }
    } catch (e) {
      return { valid: false, reason: "chain_broken" };
    }
  }

  // Verify the topmost certificate is signed by, or equals, a trusted root.
  const top = certs[certs.length - 1];
  for (const root of roots) {
    try {
      if (top.verify(root.publicKey) || childOf(top, root)) {
        return { valid: true };
      }
    } catch (e) {
      // try next root
    }
  }

  return { valid: false, reason: "untrusted_issuer" };
}

function childOf(cert, parent) {
  try {
    return cert.checkIssued(parent);
  } catch (e) {
    return false;
  }
}

module.exports = {
  createEcPublicKeyFromPoint,
  ecPublicKeyToPem,
  verifyEcdsaSignature,
  rawEcdsaToDer,
  verifyCertificateChain,
  P256_SPKI_PREFIX,
};