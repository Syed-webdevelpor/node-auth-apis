const express = require("express");
const passport = require('passport');
const session = require('express-session');
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
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());
// Initialize session management middleware
app.use(session({
  secret: 'your-secret-key', 
  resave: false, 
  saveUninitialized: true
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use("/api/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/api/introducerBroker", introducerBrokerRoutes);
app.use("/api/personalInfo", personalInfo);
app.use("/api/financialInfo", financialInfoRoutes);
app.use("/api/accountInfo", accountInfoRoutes);
app.use("/api/tradingAccount", tradingAccountRoutes);
app.use("/api/transactionDetail", transactionDetailRoutes);
app.use("/api/accountFinancial", accountFinancialRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/recentActivity", recentActivityRoutes);
app.use("/api/demoAccount", demoAccountRoutes);
app.use("/api", referFriendRoutes);
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
