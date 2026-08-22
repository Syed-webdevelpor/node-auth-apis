/**
 * Middleware to authenticate internal service-to-service requests.
 * Protects the Trading Backend internal endpoint from public access.
 *
 * The secret is sent via a secure header and compared using a
 * timing-safe comparison to prevent timing attacks.
 */
const crypto = require('crypto');

module.exports = (req, res, next) => {
  const providedSecret = req.header('x-internal-api-secret');
  const expectedSecret = process.env.INTERNAL_API_KEY;

  if (!providedSecret) {
    return res.status(401).json({ error: 'Internal API secret is missing' });
  }

  if (!expectedSecret) {
    // Server misconfiguration - fail closed
    console.error('[internal-api-auth] INTERNAL_API_KEY is not configured');
    return res.status(500).json({ error: 'Internal server configuration error' });
  }

  // Timing-safe comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedSecret);
  const expectedBuffer = Buffer.from(expectedSecret);

  if (providedBuffer.length !== expectedBuffer.length) {
    return res.status(403).json({ error: 'Invalid internal API secret' });
  }

  const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  if (!isValid) {
    return res.status(403).json({ error: 'Invalid internal API secret' });
  }

  next();
};