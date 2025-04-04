// websocket.js
const WebSocket = require('ws');

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');

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
    console.log('Client disconnected');
  });
});

function sendNotificationToUser(userId, notification) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(notification));
  }
}

module.exports = { wss, sendNotificationToUser };
