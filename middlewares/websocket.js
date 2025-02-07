const WebSocket = require('ws');

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Store connected clients and their user IDs
const clients = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Listen for messages from the client
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    // Handle subscription requests
    if (data.type === 'SUBSCRIBE') {
      const userId = data.userId;
      clients.set(ws, userId); // Map the client to the user ID
      console.log(`Client subscribed to user ID: ${userId}`);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    clients.delete(ws); // Remove the client from the map
    console.log('Client disconnected');
  });
});

module.exports = wss;