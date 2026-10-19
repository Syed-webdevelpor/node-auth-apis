const express = require("express");
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dbConnection = require("./dbConnection.js");
const userRoutes = require("./routers/user.js");
const authRoutes = require("./routers/auth.js");
const introducerBrokerRoutes = require("./routers/introducerBroker.js");
const personalInfo = require("./routers/personalInfo.js");
const financialInfoRoutes = require("./routers/financialInfo.js");
const accountInfoRoutes = require("./routers/accountInfo.js");
const tradingAccountRoutes = require("./routers/tradingAccount.js");
const transactionDetailRoutes = require("./routers/transactionDetail.js");
const accountFinancialRoutes = require("./routers/accountFinancial.js");
const walletRoutes = require("./routers/wallet.js");
const recentActivityRoutes = require("./routers/recentActivity.js");
const referFriendRoutes = require("./routers/referFriend.js");
const demoAccountRoutes = require("./routers/demoAccount.js");
const demoAccountFinancialRoutes = require("./routers/demoAccountFinancial.js");
const organizationalInfo = require("./routers/organizationalInfo.js");
const orgFinancialInfo = require("./routers/orgFinancialInfo.js");
const fetchUploadDocRoutes = require("./routers/fetchUploadDoc.js");
const withdrawalRoutes = require("./routers/withdrawal.js");
const accountManagerRoutes = require("./routers/accountManager.js");
const notificationRoutes = require("./routers/notification.js");
const ticketRoutes = require("./routers/supportTicket.js");
const notesRoutes = require("./routers/notes.js");
const versionRoutes = require("./routers/version.js");
const otpRoutes = require('./routers/otpVerification.js');
const organizationalOwnershipInfo = require("./routers/organizationalOwnershipInfo.js");
const orgInfoDoc = require("./routers/orgInfoDoc.js");
const reportsRoutes = require('./routers/reports.js');
const internalPositionsRoutes = require('./routers/internalPositions.js');
const depositWithdrawalReportRoutes = require('./routers/depositWithdrawalReport.js');
const apiKeyAuth = require('./middlewares/apikeyAuth.js');
const nestJSConnection = require('./services/NestJSConnection.js');
const PositionSyncConnection = require('./services/PositionSyncConnection.js');
const {
  sendPositionUpdateToAccount,
  setAccountSnapshotProvider,
  setAccountSubscriptionHandlers,
} = require('./middlewares/websocket.js');
const axios = require('axios');
const demoRequestRoutes = require('./routers/demoRequest.js');
const passwordSyncService = require('./services/passwordSyncService.js');
const app = express();

const port = process.env.PORT || 3003;

// If you're behind a reverse proxy (Nginx/ELB/etc) that sets X-Forwarded-For,
// this is required for express-rate-limit to identify clients correctly.
// `1` means trust the first proxy hop.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

// Middleware to parse JSON requests
app.use(express.json({ limit: '50mb' }));

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(helmet());
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'https://xsidertrader.com',
  'https://investain-portal.vercel.app',
  'https://partner.investain.com',
  'https://trading.investain.com',
  process.env.FRONTEND_URL
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'strict',
  },
}));
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  // Exclude /api/user/verify route from API key authentication
  if (req.path === '/api/user/verify' || 
      req.path.startsWith('/api/sso') || 
      req.path === '/api/request-demo') {
    return next();
  }
  return apiKeyAuth(req, res, next);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
});
// app.use(limiter);

app.use("/api/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/api/introducerBroker", introducerBrokerRoutes);
app.use("/api/personalInfo", personalInfo);
app.use("/api/organizationalInfo", organizationalInfo);
app.use("/api/orgFinancialInfo", orgFinancialInfo);
app.use("/api/financialInfo", financialInfoRoutes);
app.use("/api/accountInfo", accountInfoRoutes);
app.use("/api/tradingAccount", tradingAccountRoutes);
app.use("/api/transactionDetail", transactionDetailRoutes);
app.use("/api/accountFinancial", accountFinancialRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/recentActivity", recentActivityRoutes);
app.use("/api/demoAccount", demoAccountRoutes);
app.use("/api/demoAccountFinancial", demoAccountFinancialRoutes);
app.use("/api", referFriendRoutes);
app.use("/api/accountManagers", accountManagerRoutes);
app.use("/api/fetchAndUploadDoc", fetchUploadDocRoutes);
app.use("/api/withDrawalEmail", withdrawalRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/version", versionRoutes);
app.use('/api/otp', otpRoutes);
app.use("/api/organizationalOwnershipInfo", organizationalOwnershipInfo);
app.use("/api/orgInfoDoc", orgInfoDoc);
app.use('/api', demoRequestRoutes);

// ---- Trading Reports API (proxy to trading server) ----
app.use('/api/trading/reports', reportsRoutes);

// ---- Internal Trading Data API (proxy to trading server) ----
app.use('/api/internal/positions', internalPositionsRoutes);

// ---- CRM SSO Provider APIs ----
const ssoRoutes = require('./routers/sso.js');
app.use('/api/sso', ssoRoutes);

// ---- Deposit/Withdrawal Report APIs ----
app.use('/api/reports', depositWithdrawalReportRoutes);

app.use((err, req, res, next) => {

  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";
  res.status(err.statusCode).json({
    message: err.message,
  });
});

// If database is connected successfully, then run the server
dbConnection
  .getConnection()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      
      // Initialize NestJS WebSocket connection for real-time account financial sync
      nestJSConnection.initialize();

      // Open one account-scoped NestJS position feed when a frontend subscribes.
      const positionSyncConnections = new Map();
      setAccountSubscriptionHandlers((accountId) => {
        if (positionSyncConnections.has(accountId)) return;
        const positionSync = new PositionSyncConnection({
          accountId,
          onEvent: (event) => {
            if (!event || !event.accountId) return;
            const frontendClients = sendPositionUpdateToAccount(event.accountId, {
              type: 'POSITION_UPDATE',
              event,
            });
          },
        });
        positionSyncConnections.set(accountId, positionSync);
        positionSync.initialize();
      }, (accountId) => {
        const positionSync = positionSyncConnections.get(accountId);
        if (!positionSync) return;
        positionSync.disconnect();
        positionSyncConnections.delete(accountId);
      });

      // When a frontend subscribes to an account, immediately send it the
      // authoritative open-positions snapshot from the trading server so the UI
      // is populated without waiting for the next market tick.
      setAccountSnapshotProvider(async (accountId) => {
        try {
          const base = (process.env.TRADING_SERVER_URL || '').replace(/\/$/, '');
          const res = await axios.get(
            `${base}/internal/positions/account/${accountId}`,
            {
              headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY },
              timeout: parseInt(
                process.env.INTERNAL_POSITIONS_TIMEOUT_MS || '15000',
                10
              ),
              validateStatus: () => true,
            }
          );
          if (res.status >= 200 && res.status < 300) {
            return {
              type: 'POSITION_SNAPSHOT',
              accountId,
              positions: res.data.positions || [],
            };
          }
          // Fall back to whatever the live feed already has cached for this account.
          const positionSync = positionSyncConnections.get(accountId);
          const cached = positionSync
            ? positionSync.getAccountPositions(accountId)
            : [];
          return { type: 'POSITION_SNAPSHOT', accountId, positions: cached };
        } catch (err) {
          console.error(
            `Position snapshot fetch failed for ${accountId}:`,
            err.message
          );
          const positionSync = positionSyncConnections.get(accountId);
          const cached = positionSync
            ? positionSync.getAccountPositions(accountId)
            : [];
          return { type: 'POSITION_SNAPSHOT', accountId, positions: cached };
        }
      });

      // Start password sync retry worker (Redis-backed queue)
      passwordSyncService.startRetryWorker();
    });
  })
  .catch((err) => {
    console.log(`Failed to connect to the database: ${err.message}`);
  });
