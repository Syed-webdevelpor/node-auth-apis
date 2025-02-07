const WebSocket = require('ws');

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Listen for messages from the client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Handle subscription requests
      if (data.type === 'SUBSCRIBE') {
        const userId = data.userId;
        if (userId) {
          ws.userId = userId; // Store userId on the client object
          console.log(`Client subscribed to user ID: ${userId}`);
        } else {
          console.error('Invalid userId in SUBSCRIBE message');
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

module.exports = { wss };