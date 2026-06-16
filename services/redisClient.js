const dotenv = require('dotenv');
const { createClient } = require('redis');

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

let client;

function buildClient() {
  if (REDIS_URL) {
    return createClient({ url: REDIS_URL });
  }

  return createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
    },
    password: REDIS_PASSWORD || undefined,
  });
}

async function getRedisClient() {
  if (client) return client;

  client = buildClient();

  // Avoid unhandled rejection crashes; log and allow request handlers to fail gracefully.
  client.on('error', (err) => {
    console.error('[redis] client error:', err?.message || err);
  });

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}

module.exports = {
  getRedisClient,
};

