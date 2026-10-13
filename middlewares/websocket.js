// websocket.js
const WebSocket = require('ws');

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map();

// Account-keyed subscribers for the real-time position feed.
// accountId -> Set<ws>. A single socket may watch several accounts, and several
// sockets may watch the same account.
const accountClients = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Track which accounts this socket is subscribed to (for cleanup on close).
  ws.accountSubscriptions = new Set();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'SUBSCRIBE') {
        const userId = data.userId;
        if (userId) {
          ws.userId = userId;
          clients.set(userId, ws);
          console.log(`Client subscribed to user ID: ${userId}`);
        } else {
          console.error('Invalid userId in SUBSCRIBE message');
        }

        // Optional account-keyed subscription for live position updates.
        // The frontend passes the trading account id (UUID) it wants to watch.
        const accountId = data.accountId;
        if (accountId) {
          if (!accountClients.has(accountId)) {
            accountClients.set(accountId, new Set());
          }
          accountClients.get(accountId).add(ws);
          ws.accountSubscriptions.add(accountId);
          console.log(`Client subscribed to account ID: ${accountId}`);

          // Push an immediate snapshot so the client is populated right away,
          // without waiting for the next market tick. Best-effort / non-fatal.
          if (accountSnapshotProvider) {
            Promise.resolve()
              .then(() => accountSnapshotProvider(accountId, ws))
              .catch((err) =>
                console.error(
                  `Account snapshot provider failed for ${accountId}:`,
                  err.message
                )
              );
          }
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    if (ws.userId) {
      clients.delete(ws.userId);
      console.log(`Client unsubscribed from user ID: ${ws.userId}`);
    }
    if (ws.accountSubscriptions) {
      for (const accountId of ws.accountSubscriptions) {
        const set = accountClients.get(accountId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) accountClients.delete(accountId);
        }
      }
    }
    console.log('Client disconnected');
  });
});

function sendNotificationToUser(userId, notification) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(notification));
  }
}

// Optional provider that returns the initial position snapshot for an account
// when a client subscribes. May be sync or async (return a value or a Promise).
// Set by app.js from the position feed + trading-server reconcile.
let accountSnapshotProvider = null;
function setAccountSnapshotProvider(fn) {
  accountSnapshotProvider = typeof fn === 'function' ? fn : null;
}

/**
 * Broadcast a live position update to every frontend socket subscribed to the
 * given trading account. Silently no-ops when nobody is watching.
 * @param {string} accountId - trading account UUID
 * @param {Object} payload - already-shaped message (will be JSON stringified)
 */
function sendPositionUpdateToAccount(accountId, payload) {
  const set = accountClients.get(accountId);
  if (!set || set.size === 0) return;
  const frame = JSON.stringify(payload);
  for (const client of set) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(frame);
    }
  }
}

module.exports = {
  wss,
  sendNotificationToUser,
  sendPositionUpdateToAccount,
  setAccountSnapshotProvider,
};

