const express = require("express");
const dbConnection = require("./dbConnection.js");
const routes = require("./routes.js");
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use("/api", routes);
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";
  res.status(err.statusCode).json({
    message: err.message,
  });
});

// If database is connected successfully, then run the server
dbConnection.connect((err) => {
  if (err) {
    console.error(`Failed to connect to the database: ${err.message}`);
    return;
  }

  // Start the server if the database connection is successful
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
