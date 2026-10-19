const io = require('socket.io-client');

/**
 * Service-to-service consumer for the NestJS trading platform's real-time
 * position feed.
 *
 * Mirrors the sibling `NestJSConnection` service (account-financial-sync) but
 * targets the account-keyed `/position-sync` namespace instead of the
 * user-keyed channels. A peer backend server has no user session, so the
 * account-keyed namespace is the only routable path for position updates.
 *
 * This consumer keeps a local, in-memory position cache
 * (accountId -> positionId -> snapshot) and reconciles it on every
 * `position-sync` event. It is intentionally decoupled from any particular DB
 * schema so it can be unit-tested without a database. To persist to MySQL,
 * inject a `reconcileSink` (see constructor + `app.js`).
 *
 * See `docs/position-sync.md` for the full protocol description.
 */
class PositionSyncConnection {
  constructor(options = {}) {
    this.socket = null;
    this.isConnected = false;

    // Connection config - mirror NestJSConnection so both feeds share env vars.
    this.nestjsUrl = options.nestjsUrl || process.env.NESTJS_WS_URL || 'http://localhost:3000';
    this.serverId = options.serverId || process.env.SERVER_ID || 'express-server';
    this.apiKey =
      options.apiKey !== undefined ? options.apiKey : process.env.INTERNAL_API_KEY;
    // This connection subscribes to one account selected by a frontend client.
    this.accountId =
      options.accountId !== undefined
        ? options.accountId
        : null;
    this.socketPath = options.socketPath || process.env.SOCKET_IO_PATH || '/trading/socket.io';

    // Injectable socket.io factory - lets unit tests supply a fake socket.
    this._io = options.ioFactory || io;

    // Optional persistence sink: fn(snapshot, { accountId, positionId, isClosed }).
    // Defaults to null => in-memory cache reconcile only.
    this._reconcileSink = options.reconcileSink || null;

    // Optional event fan-out hook: fn(event) called once per well-formed
    // position-sync envelope (after the cache has been reconciled). Used by
    // app.js to push live updates to frontend WebSocket clients. The event is
    // the raw PositionSyncEvent { type, accountId, data, timestamp }.
    this._onEvent = options.onEvent || null;

    // Local position cache: accountId -> Map(positionId -> snapshot).
    this.cache = new Map();
  }

  /**
   * Initialize the connection to the NestJS /position-sync namespace.
   */
  initialize() {
    if (!this.apiKey) {
      console.error('🔴 INTERNAL_API_KEY is not configured; position-sync connection not started');
      return;
    }
    if (!this.accountId) {
      console.error('🔴 Account ID is required; position-sync connection not started');
      return;
    }

    const query = {
      serverType: 'express-server',
      serverId: this.serverId,
    };
    query.accountId = this.accountId;

    this.socket = this._io(`${this.nestjsUrl}/position-sync`, {
      auth: { apiKey: this.apiKey },
      query,
      path: this.socketPath,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000,
      timeout: 10000,
    });

    this.setupEventHandlers();
  }

  /**
   * Set up Socket.IO event handlers.
   */
  setupEventHandlers() {
    this.socket.on('connect', () => {
      this.isConnected = true;
      // Register this server (guard for a server that doesn't use this event).
      try {
        this.socket.emit('register-server', {
          serverId: this.serverId,
          accountId: this.accountId || null,
        });
      } catch (e) {
        console.warn('register-server emit failed (non-fatal):', e.message);
      }
    });

    this.socket.on('server-registered', (ack) => {
      if (ack && ack.success) {
        console.log(
          `✅ position-sync subscribed to account: ${ack.accountId || 'ALL ACCOUNTS'}`
        );
      } else {
        console.error('❌ position-sync subscription rejected:', ack);
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('❌ Disconnected from NestJS position-sync:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 position-sync connection error:', error.message);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 position-sync reconnection attempt #${attemptNumber}...`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ position-sync reconnected after ${attemptNumber} attempts`);
    });

    // Position sync events (created / updated / closed).
    this.socket.on('position-sync', (event) => {
      this.handlePositionSync(event);
    });

    this.socket.on('error', (error) => {
      console.error('🔴 position-sync WebSocket error:', error);
    });
  }

  /**
   * Normalize a PositionSyncEvent envelope into an array of snapshots and
   * reconcile each one. POSITION_CREATED / POSITION_CLOSED carry a single
   * snapshot; POSITION_UPDATED carries an array (coalesced quote-tick batch),
   * but we defensively coerce both shapes.
   * @param {Object} event - PositionSyncEvent envelope
   */
  handlePositionSync(event) {
    if (!event || typeof event !== 'object') {
      console.warn('⚠️  Ignoring malformed position-sync event');
      return;
    }

    const { type, accountId, data } = event;
    const snapshots = Array.isArray(data) ? data : [data];

    let reconciled = 0;
    for (const snapshot of snapshots) {
      if (!snapshot || typeof snapshot !== 'object') continue;
      // The envelope accountId is always present and is the routing key; use it
      // as a fallback if a snapshot omits it.
      const normalized = snapshot.accountId ? snapshot : { ...snapshot, accountId };
      if (!normalized.positionId || !normalized.accountId) {
        console.error('❌ Missing positionId/accountId in snapshot; skipping');
        continue;
      }
      this.reconcilePosition(normalized, type);
      reconciled++;
    }

    // Fan the raw envelope out once (only when at least one valid snapshot was
    // reconciled) so downstream consumers never receive junk events.
    if (reconciled > 0 && typeof this._onEvent === 'function') {
      try {
        this._onEvent(event);
      } catch (e) {
        console.error('❌ position-sync onEvent hook failed (non-fatal):', e.message);
      }
    }
  }

  /**
   * Reconcile a single position snapshot into the local cache (and optional
   * sink). A position is treated as closed when the event type is
   * POSITION_CLOSED, status is CLOSED, or remaining qty is 0.
   * @param {Object} snapshot - PositionSyncSnapshot
   * @param {string} [eventType] - originating event type
   */
  reconcilePosition(snapshot, eventType) {
    const { positionId, accountId } = snapshot;

    // positionId + accountId are the only always-present fields.
    if (!positionId || !accountId) {
      console.error('❌ Missing positionId/accountId in snapshot; skipping');
      return;
    }

    const isClosed = this.isClosed(snapshot, eventType);

    if (!this.cache.has(accountId)) {
      this.cache.set(accountId, new Map());
    }
    const accountCache = this.cache.get(accountId);

    if (isClosed) {
      accountCache.delete(positionId);
    } else {
      accountCache.set(positionId, snapshot);
    }

    if (typeof this._reconcileSink === 'function') {
      try {
        this._reconcileSink(snapshot, { accountId, positionId, isClosed, eventType });
      } catch (e) {
        console.error('❌ reconcile sink failed (non-fatal):', e.message);
      }
    }
  }

  /**
   * Decide whether a snapshot represents a fully-closed position.
   * @returns {boolean}
   */
  isClosed(snapshot, eventType) {
    if (eventType === 'POSITION_CLOSED') return true;
    if (typeof snapshot.status === 'string' && snapshot.status.toUpperCase() === 'CLOSED') {
      return true;
    }
    if (snapshot.qty !== undefined && snapshot.qty !== null && Number(snapshot.qty) === 0) {
      return true;
    }
    return false;
  }

  /**
   * Read a single cached position.
   * @returns {Object|null}
   */
  getPosition(accountId, positionId) {
    const accountCache = this.cache.get(accountId);
    if (!accountCache) return null;
    return accountCache.get(positionId) || null;
  }

  /**
   * List all cached (open) positions for an account.
   * @returns {Object[]}
   */
  getAccountPositions(accountId) {
    const accountCache = this.cache.get(accountId);
    if (!accountCache) return [];
    return Array.from(accountCache.values());
  }

  /**
   * Clear the local position cache (e.g. on a full resync).
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Disconnect from the NestJS position-sync namespace.
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      console.log('🔌 Disconnected from NestJS position-sync');
    }
  }

  /**
   * Get connection status.
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  // --- Test injection hooks (mirror services/otp/* convention) -------------

  /**
   * Override the socket.io factory. Returns a restore function.
   * @param {Function} fn
   * @returns {Function} restore
   */
  _setIoFactoryForTest(fn) {
    const prev = this._io;
    this._io = fn;
    return () => {
      this._io = prev;
    };
  }

  /**
   * Override the reconcile sink. Returns a restore function.
   * @param {Function|null} fn
   * @returns {Function} restore
   */
  _setReconcileSinkForTest(fn) {
    const prev = this._reconcileSink;
    this._reconcileSink = fn;
    return () => {
      this._reconcileSink = prev;
    };
  }

  /**
   * Override the event fan-out hook. Returns a restore function.
   * @param {Function|null} fn
   * @returns {Function} restore
   */
  _setOnEventForTest(fn) {
    const prev = this._onEvent;
    this._onEvent = fn;
    return () => {
      this._onEvent = prev;
    };
  }
}

// Export the class for tests / advanced wiring, plus a ready singleton.
module.exports = PositionSyncConnection;
module.exports.PositionSyncConnection = PositionSyncConnection;
module.exports.positionSyncConnection = new PositionSyncConnection();
