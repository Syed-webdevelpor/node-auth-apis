const crypto = require('crypto');
const DB = require('../dbConnection.js');
const { getRedisClient } = require('../services/redisClient.js');

// Redis key prefix for idempotency tracking
const APPLIED_SYNC_KEY = 'password_sync:applied';

/**
 * Internal endpoint handler for the Trading Backend.
 * Receives a password hash from the Portal and updates the Trading user's password.
 *
 * SECURITY:
 * - Protected by internalApiAuth middleware (X-Internal-Api-Secret header)
 * - Never receives or stores plaintext passwords
 * - Never logs the password hash
 * - Idempotent: same syncId produces the same final state (tracked in Redis)
 */
async function handlePasswordChanged(req, res) {
  const { userId, passwordHash, syncId } = req.body;

  if (!userId || !passwordHash || !syncId) {
    return res.status(400).json({ error: 'userId, passwordHash, and syncId are required' });
  }

  // Validate passwordHash format (bcrypt hash)
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(passwordHash)) {
    return res.status(400).json({ error: 'Invalid passwordHash format' });
  }

  try {
    const client = await getRedisClient();

    // Idempotency: check if this syncId was already applied
    const alreadyApplied = await client.sIsMember(APPLIED_SYNC_KEY, syncId);
    if (alreadyApplied) {
      return res.status(200).json({ success: true, idempotent: true });
    }

    // Update the user's password hash
    const [result] = await DB.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [passwordHash, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Record the sync for idempotency (7-day TTL to bound growth)
    await client.sAdd(APPLIED_SYNC_KEY, syncId);
    await client.expire(APPLIED_SYNC_KEY, 604800);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[internal-user] password sync error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  handlePasswordChanged,
};