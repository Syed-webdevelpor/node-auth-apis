const cbor = require("cbor");

/**
 * Parse a COSE_Key (CBOR) credential public key and extract the raw
 * uncompressed EC point used by Apple App Attest and standard WebAuthn.
 *
 * Expected map (EdDSA/ECDSA):
 *   kty=2 (EC2), crv=1 (P-256), x (bytes), y (bytes)
 *
 * @param {Buffer} coseKeyBytes - raw CBOR bytes of the credential public key
 * @returns {{ point: Buffer, x: Buffer, y: Buffer, curve: string }}
 */
function parseCoseEcPublicKey(coseKeyBytes) {
  let decoded;
  try {
    decoded = cbor.decodeFirstSync(Buffer.from(coseKeyBytes));
  } catch (e) {
    throw new Error("invalid_cose_key");
  }

  let map;
  if (decoded instanceof Map) {
    map = decoded;
  } else if (decoded && typeof decoded === "object") {
    map = new Map();
    for (const [k, v] of Object.entries(decoded)) {
      map.set(Number(k), v);
    }
  } else {
    throw new Error("invalid_cose_key");
  }

  const kty = map.get(1);
  const crv = map.get(-1);
  const xBuf = normalizeBytes(map.get(-2));
  const yBuf = normalizeBytes(map.get(-3));

  if (kty !== 2 || crv !== 1) {
    throw new Error("unsupported_cose_key");
  }
  if (!xBuf || !yBuf) {
    throw new Error("invalid_cose_key");
  }

  const COORD_LEN = 32;
  const x = xBuf.length === COORD_LEN ? xBuf : leftPad32(xBuf);
  const y = yBuf.length === COORD_LEN ? yBuf : leftPad32(yBuf);

  const point = Buffer.concat([Buffer.from([0x04]), x, y]);

  return { point, x, y, curve: "prime256v1" };
}

function normalizeBytes(v) {
  if (!v) return null;
  if (Buffer.isBuffer(v)) return v;
  if (ArrayBuffer.isView(v)) return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
  if (Array.isArray(v) && v.every((b) => Number.isInteger(b))) return Buffer.from(v);
  return null;
}

function leftPad32(buf) {
  if (buf.length >= 32) return buf.subarray(buf.length - 32);
  const padded = Buffer.alloc(32);
  buf.copy(padded, 32 - buf.length);
  return padded;
}

module.exports = { parseCoseEcPublicKey };