const { v4: uuidv4 } = require('uuid');
const { getRedisClient } = require('./redisClient');

const TTL_SECONDS = 60;
const PREFIX = 'sso:token:';

function buildRedisKey(token) {
  return `${PREFIX}${token}`;
}

// We use Redis as the single source of truth.
// Single-use is implemented by atomically consuming token via GETDEL (Redis >= 6.2).
// If GETDEL is not supported in a deployment, consume will fail and fall back to non-atomic delete can be added later.
async function generateSingleUseToken({ userId, email }) {
  const token = uuidv4();
  const redisKey = buildRedisKey(token);

  const payload = {
    userId,
    email,
    createdAt: new Date().toISOString(),
  };

  const client = await getRedisClient();

  // SET key value EX ttl
  await client.set(redisKey, JSON.stringify(payload), {
    EX: TTL_SECONDS,
  });

  return token;
}

async function consumeSingleUseToken(token) {
  if (!token) return null;

  const client = await getRedisClient();
  const redisKey = buildRedisKey(token);

  // Atomic consume: return value and delete key in one step.
  // Prevents replay attacks by ensuring only one caller can read the token.
  if (typeof client.getDel !== 'function') {
    // Older redis server/client without getDel support.
    // We still attempt non-atomic pattern as best-effort.
    const val = await client.get(redisKey);
    if (!val) return null;
    await client.del(redisKey);
    return JSON.parse(val);
  }

  const val = await client.getDel(redisKey);
  if (!val) return null;

  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

module.exports = {
  TTL_SECONDS,
  generateSingleUseToken,
  consumeSingleUseToken,
};

