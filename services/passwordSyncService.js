const axios = require('axios');
const crypto = require('crypto');
const { getRedisClient } = require('./redisClient.js');

// Redis key prefixes
const PENDING_QUEUE_KEY = 'password_sync:pending';
const IN_PROGRESS_QUEUE_KEY = 'password_sync:in_progress';
const RETRY_COUNT_KEY = 'password_sync:retry_count';
const COMPLETED_KEY = 'password_sync:completed';

// Configuration
const TRADING_SERVER_URL = process.env.TRADING_SERVER_URL;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const SYNC_TIMEOUT_MS = parseInt(process.env.PASSWORD_SYNC_TIMEOUT_MS || '10000', 10);
const MAX_RETRIES = parseInt(process.env.PASSWORD_SYNC_MAX_RETRIES || '5', 10);
const RETRY_BASE_DELAY_MS = parseInt(process.env.PASSWORD_SYNC_RETRY_BASE_DELAY_MS || '5000', 10);

/**
 * Structured logger - never logs passwords, hashes, or tokens.
 */
const log = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({ level: 'info', msg, ...meta, ts: new Date().toISOString() }));
  },
  warn: (msg, meta = {}) => {
    console.warn(JSON.stringify({ level: 'warn', msg, ...meta, ts: new Date().toISOString() }));
  },
  error: (msg, meta = {}) => {
    console.error(JSON.stringify({ level: 'error', msg, ...meta, ts: new Date().toISOString() }));
  },
};

/**
 * Generate a stable sync ID for idempotency.
 * Same userId + passwordHash always produces the same syncId.
 */
function generateSyncId(userId, passwordHash) {
  return crypto.createHash('sha256').update(`${userId}:${passwordHash}`).digest('hex');
}

/**
 * Compute exponential backoff delay for a given attempt number.
 */
function getRetryDelay(attempt) {
  return RETRY_BASE_DELAY_MS * Math.pow(2, Math.min(attempt, 6));
}

/**
 * Send the password hash to the Trading Backend internal endpoint.
 * Never sends plaintext password. Never logs the hash.
 */
async function sendPasswordHashToTrading({ userId, tradingUserId, passwordHash, syncId }) {
  if (!TRADING_SERVER_URL) {
    throw new Error('TRADING_SERVER_URL is not configured');
  }
  if (!INTERNAL_API_KEY) {
    throw new Error('INTERNAL_API_KEY is not configured');
  }

  const url = `${TRADING_SERVER_URL.replace(/\/$/, '')}/internal/users/password-changed`;

  log.info('password sync started', { userId, tradingUserId, syncId });

  const response = await axios.post(
    url,
    {
      userId: tradingUserId || userId,
      passwordHash,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': INTERNAL_API_KEY,
      },
      timeout: SYNC_TIMEOUT_MS,
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: true }),
    }
  );

  if (response.status >= 200 && response.status < 300) {
    log.info('password sync succeeded', { userId, tradingUserId, syncId });
    return { success: true, syncId };
  }

  throw new Error(`Trading Backend returned status ${response.status}`);
}

/**
 * Enqueue a failed sync into the Redis retry queue.
 */
async function enqueueRetry(payload) {
  const client = await getRedisClient();
  const retryKey = `${RETRY_COUNT_KEY}:${payload.syncId}`;

  const currentAttempt = parseInt(await client.get(retryKey) || '0', 10);
  if (currentAttempt >= MAX_RETRIES) {
    log.error('password sync failed - max retries reached', {
      userId: payload.userId,
      syncId: payload.syncId,
      attempts: currentAttempt,
    });
    return { success: false, exhausted: true };
  }

  const nextAttempt = currentAttempt + 1;
  const delayMs = getRetryDelay(nextAttempt);

  // Store payload in a hash for idempotent retry
  await client.hSet(`password_sync:payload:${payload.syncId}`, {
    userId: String(payload.userId),
    tradingUserId: String(payload.tradingUserId || ''),
    passwordHash: payload.passwordHash,
    syncId: payload.syncId,
  });

  // Set retry count with TTL (e.g., 24h) to avoid unbounded growth
  await client.set(retryKey, String(nextAttempt), { EX: 86400 });

  // Push to pending queue with scheduled retry time
  const scheduledAt = Date.now() + delayMs;
  await client.zAdd(PENDING_QUEUE_KEY, { score: scheduledAt, value: payload.syncId });

  log.warn('password sync failed - scheduled retry', {
    userId: payload.userId,
    syncId: payload.syncId,
    attempt: nextAttempt,
    retryInMs: delayMs,
  });

  return { success: false, scheduled: true, attempt: nextAttempt };
}

/**
 * Process the retry queue - called by the background worker.
 * Picks up due items and attempts to sync them.
 */
async function processRetryQueue() {
  const client = await getRedisClient();
  const now = Date.now();

  // Find due items
  const dueItems = await client.zRangeByScore(PENDING_QUEUE_KEY, 0, now, { LIMIT: { offset: 0, count: 10 } });

  for (const syncId of dueItems) {
    // Move to in-progress to prevent concurrent processing
    const removed = await client.zRem(PENDING_QUEUE_KEY, syncId);
    if (!removed) continue;

    const payloadRaw = await client.hGetAll(`password_sync:payload:${syncId}`);
    if (!payloadRaw || !payloadRaw.userId || !payloadRaw.passwordHash) {
      // Corrupt entry - clean up
      await client.del(`password_sync:payload:${syncId}`);
      await client.del(`${RETRY_COUNT_KEY}:${syncId}`);
      continue;
    }

    const payload = {
      userId: payloadRaw.userId,
      tradingUserId: payloadRaw.tradingUserId || null,
      passwordHash: payloadRaw.passwordHash,
      syncId,
    };

    try {
      await sendPasswordHashToTrading(payload);
      // Success - clean up
      await client.del(`password_sync:payload:${syncId}`);
      await client.del(`${RETRY_COUNT_KEY}:${syncId}`);
      await client.sAdd(COMPLETED_KEY, syncId);
      await client.expire(COMPLETED_KEY, 86400); // keep completed record for 24h
    } catch (err) {
      log.error('password sync failed', {
        userId: payload.userId,
        syncId,
        error: err.message,
      });
      // Re-enqueue for retry
      await enqueueRetry(payload);
    }
  }
}

/**
 * Main entry point - called after a successful Portal password update.
 * Attempts immediate sync; on failure, enqueues to Redis retry queue.
 */
async function syncPassword({ userId, tradingUserId, passwordHash }) {
  if (!userId || !passwordHash) {
    throw new Error('userId and passwordHash are required');
  }

  const syncId = generateSyncId(userId, passwordHash);
  const payload = { userId, tradingUserId, passwordHash, syncId };

  // Idempotency check - if already completed, skip
  const client = await getRedisClient();
  const alreadyCompleted = await client.sIsMember(COMPLETED_KEY, syncId);
  if (alreadyCompleted) {
    log.info('password sync skipped - already completed', { userId, syncId });
    return { success: true, skipped: true, syncId };
  }

  try {
    await sendPasswordHashToTrading(payload);
    await client.sAdd(COMPLETED_KEY, syncId);
    await client.expire(COMPLETED_KEY, 86400);
    return { success: true, syncId };
  } catch (err) {
    log.error('password sync failed - initial attempt', {
      userId,
      syncId,
      error: err.message,
    });
    // Enqueue for retry
    return enqueueRetry(payload);
  }
}

/**
 * Start the background retry worker.
 * Polls the Redis queue periodically.
 */
function startRetryWorker(intervalMs = 15000) {
  log.info('password sync retry worker started', { intervalMs });
  const timer = setInterval(async () => {
    try {
      await processRetryQueue();
    } catch (err) {
      log.error('password sync retry worker error', { error: err.message });
    }
  }, intervalMs);
  // Don't keep the process alive just for the worker
  timer.unref();
  return timer;
}

module.exports = {
  syncPassword,
  processRetryQueue,
  startRetryWorker,
  generateSyncId,
  _internal: { sendPasswordHashToTrading, enqueueRetry, getRetryDelay },
};