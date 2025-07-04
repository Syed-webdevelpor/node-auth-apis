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
const apiKeyAuth = require('./middlewares/apikeyAuth.js');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(helmet());
app.use(apiKeyAuth);
const allowedOrigins = [
  'http://localhost:3000',
  'https://investain-portal.vercel.app',
  'https://partner.investain.com',
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
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
});
// app.use(limiter);
app.get("/", (req, res) => {
  res.send("Hello World!");
});
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
    });
  })
  .catch((err) => {
    console.log(`Failed to connect to the database: ${err.message}`);
  });
