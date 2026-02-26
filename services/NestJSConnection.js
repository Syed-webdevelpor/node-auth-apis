const io = require('socket.io-client');
const DB = require('../dbConnection.js');

class NestJSConnection {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    
    // Configure the connection - replace with your NestJS server URL
    this.nestjsUrl = process.env.NESTJS_WS_URL || 'http://localhost:3000';
    this.serverId = process.env.SERVER_ID || 'express-server';
  }

  /**
   * Initialize the connection to NestJS WebSocket server
   */
  initialize() {
    console.log(`🔄 Connecting to NestJS Account Financial Sync...`);
    console.log(`   URL: ${this.nestjsUrl}/account-financial-sync`);

    this.socket = io(`${this.nestjsUrl}/account-financial-sync`, {
      query: {
        serverType: 'express-server',
        serverId: this.serverId
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000,
      timeout: 10000,
    });

    this.setupEventHandlers();
  }

  /**
   * Set up Socket.IO event handlers
   */
  setupEventHandlers() {
    // Connection established
    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Connected to NestJS Account Financial Sync');
      console.log('   Socket ID:', this.socket.id);
      
      // Register this server with the NestJS server
      this.socket.emit('register-server', {
        serverId: this.serverId,
        accountId: null // Set specific account ID if needed
      });
    });

    // Disconnected from server
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('❌ Disconnected from NestJS:', reason);
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('🔴 Connection error:', error.message);
    });

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt #${attemptNumber}...`);
    });

    // Reconnection successful
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
    });

    // Account financial update received
    this.socket.on('account-financial-update', (data) => {
      console.log('📊 Received account financial update:', data);
      this.handleAccountFinancialUpdate(data);
    });

    // Error event
    this.socket.on('error', (error) => {
      console.error('🔴 WebSocket error:', error);
    });
  }

  /**
   * Handle incoming account financial update from NestJS
   * @param {Object} data - Account financial data from NestJS
   */
  async handleAccountFinancialUpdate(data) {
    try {
      // Map NestJS data to database schema
      // NestJS: accountId, account_id, equity, balance, margin, free_margin, margin_level, credit, updatedAt
      // Database: account_id, equity, balance, margin, free_margin, margin_level, credit, updated_at
      
      const accountId = data.accountId || data.account_id;
      
      if (!accountId) {
        console.error('❌ Missing accountId in update data');
        return;
      }

      // Check if account exists
      const [existingAccount] = await DB.execute(
        'SELECT id FROM account_financials WHERE account_id = ?',
        [accountId]
      );

      if (existingAccount.length === 0) {
        console.log(`⚠️ Account ${accountId} not found, creating new record`);
        
        // Create new account financial record
        const { v4: uuidv4 } = require('uuid');
        const uuid = uuidv4();
        
        await DB.execute(
          `INSERT INTO account_financials 
            (id, account_id, equity, balance, margin, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?)`,
          [
            uuid,
            accountId,
            data.equity || 0,
            data.balance || 0,
            data.margin || 0,
            data.updatedAt || new Date()
          ]
        );
        
        console.log(`✅ Created new account financial record for ${accountId}`);
        return;
      }

      // Update existing account financial record
      await DB.execute(
        `UPDATE account_financials 
          SET equity = ?, balance = ?, margin = ?, updated_at = ? 
          WHERE account_id = ?`,
        [
          data.equity,
          data.balance,
          data.margin,
          data.updatedAt || new Date(),
          accountId
        ]
      );

      console.log(`✅ Synced account ${accountId}: equity=${data.equity}, balance=${data.balance}, margin=${data.margin}`);
    } catch (error) {
      console.error('❌ Failed to update account financial:', error.message);
    }
  }

  /**
   * Disconnect from NestJS WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      console.log('🔌 Disconnected from NestJS');
    }
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Create singleton instance
const nestJSConnection = new NestJSConnection();

module.exports = nestJSConnection;
