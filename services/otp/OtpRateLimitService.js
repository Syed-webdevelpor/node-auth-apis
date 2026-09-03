const config = require("./config");
const { getRedisClient } = require("../redisClient");
const { logSecurity } = require("./securityLogger");

// Injectable for tests (defaults to the real Redis client).
let redisGetter = getRedisClient;

function _setRedisClientForTest(fn) {
  redisGetter = fn;
  return () => { redisGetter = getRedisClient; };
}

const INCR_SCRIPT = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return c
`;

async function incrementAndCheck({ key, limit, windowSeconds }) {
  try {
    const client = await redisGetter();
    const count = await client.eval(INCR_SCRIPT, { keys: [key], arguments: [String(windowSeconds)] });
    const used = Number(count);
    if (!Number.isFinite(used)) {
      return { allowed: false, reason: "rate_limit_unavailable" };
    }
    if (used > limit) {
      return { allowed: false, reason: "limit_exceeded", retryAfterSec: windowSeconds };
    }
    return { allowed: true, used };
  } catch (e) {
    return { allowed: false, reason: "rate_limit_unavailable" };
  }
}

/**
 * Cooldown guard: returns true when NOT currently in cooldown (a new cooldown
 * is atomically started). Returns false when the key is in cooldown.
 */
async function startCooldownIfAllowed({ key, cooldownSeconds }) {
  try {
    const client = await redisGetter();
    const set = await client.set(key, "1", { EX: cooldownSeconds, NX: true });
    return set !== null;
  } catch (e) {
    return false; // fail closed
  }
}

async function applyRequestLimits({ ip, phone, deviceId }) {
  // Order from the security spec: IP -> phone -> device.
  const ipResult = await incrementAndCheck({
    key: `otp:rate:ip:${ip}`,
    limit: config.OTP_IP_RATE_LIMIT,
    windowSeconds: config.OTP_RATE_LIMIT_WINDOW_SECONDS,
  });
  if (!ipResult.allowed) {
    logSecurity({ operation: "ratelimit", result: "block", reason: "ip_limit", details: { ipRate: ipResult.used } });
    return { allowed: false, reason: "rate_limit", retryAfterSec: ipResult.retryAfterSec };
  }

  const phoneResult = await incrementAndCheck({
    key: `otp:rate:phone:${phone}`,
    limit: config.OTP_PHONE_RATE_LIMIT,
    windowSeconds: config.OTP_RATE_LIMIT_WINDOW_SECONDS,
  });
  if (!phoneResult.allowed) {
    logSecurity({ operation: "ratelimit", result: "block", reason: "phone_limit", details: { phoneRate: phoneResult.used } });
    return { allowed: false, reason: "rate_limit", retryAfterSec: phoneResult.retryAfterSec };
  }

  // Only apply a device limit when we have a trusted (attested) device id.
  if (deviceId) {
    const deviceResult = await incrementAndCheck({
      key: `otp:rate:device:${deviceId}`,
      limit: config.OTP_DEVICE_RATE_LIMIT,
      windowSeconds: config.OTP_RATE_LIMIT_WINDOW_SECONDS,
    });
    if (!deviceResult.allowed) {
      logSecurity({ operation: "ratelimit", result: "block", reason: "device_limit", details: { deviceRate: deviceResult.used } });
      return { allowed: false, reason: "rate_limit", retryAfterSec: deviceResult.retryAfterSec };
    }
  }

  // OTP cooldown (per phone).
  const cooldownOk = await startCooldownIfAllowed({
    key: `otp:cooldown:${phone}`,
    cooldownSeconds: config.OTP_COOLDOWN_SECONDS,
  });
  if (!cooldownOk) {
    logSecurity({ operation: "ratelimit", result: "block", reason: "cooldown", details: { cooldown: true } });
    return { allowed: false, reason: "cooldown", retryAfterSec: config.OTP_COOLDOWN_SECONDS };
  }

  return { allowed: true };
}

async function applyVerifyLimits({ ip, phone, deviceId }) {
  const ipResult = await incrementAndCheck({
    key: `otp:verify:ip:${ip}`,
    limit: config.OTP_VERIFY_ATTEMPT_LIMIT,
    windowSeconds: config.OTP_VERIFY_WINDOW_SECONDS,
  });
  if (!ipResult.allowed) {
    return { allowed: false, reason: "verify_rate_limit", retryAfterSec: ipResult.retryAfterSec };
  }

  const phoneResult = await incrementAndCheck({
    key: `otp:verify:phone:${phone}`,
    limit: config.OTP_VERIFY_ATTEMPT_LIMIT,
    windowSeconds: config.OTP_VERIFY_WINDOW_SECONDS,
  });
  if (!phoneResult.allowed) {
    return { allowed: false, reason: "verify_rate_limit", retryAfterSec: phoneResult.retryAfterSec };
  }

  if (deviceId) {
    const deviceResult = await incrementAndCheck({
      key: `otp:verify:device:${deviceId}`,
      limit: config.OTP_VERIFY_ATTEMPT_LIMIT,
      windowSeconds: config.OTP_VERIFY_WINDOW_SECONDS,
    });
    if (!deviceResult.allowed) {
      return { allowed: false, reason: "verify_rate_limit", retryAfterSec: deviceResult.retryAfterSec };
    }
  }

  return { allowed: true };
}

module.exports = {
  applyRequestLimits,
  applyVerifyLimits,
  _incrementAndCheck: incrementAndCheck,
  _setRedisClientForTest,
  INCR_SCRIPT,
};