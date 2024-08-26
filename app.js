const express = require("express");
const dbConnection = require("./dbConnection.js");
const userRoutes = require("./routers/user.js");
const personalInfo = require("./routers/personalInfo.js");
const financialInfoRoutes = require("./routers/financialInfo.js");
const accountInfoRoutes = require("./routers/accountInfo.js");
const accountRoutes = require("./routers/account.js");
const transactionDetailRoutes = require("./routers/transactionDetail.js");
const referFriendRoutes = require("./routers/referFriend.js");
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use("/api", userRoutes);
app.use("/api", personalInfo);
app.use("/api", financialInfoRoutes);
app.use("/api", accountInfoRoutes);
app.use("/api", accountRoutes);
app.use("/api", transactionDetailRoutes);
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
