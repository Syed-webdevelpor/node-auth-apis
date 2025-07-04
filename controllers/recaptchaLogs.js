const DB = require("../dbConnection.js");

// Controller to get recaptcha logs with optional pagination
const getRecaptchaLogs = async (req, res, next) => {
  try {
    // Optional query params for pagination
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const [rows] = await DB.execute(
      "SELECT * FROM recaptcha_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );

    res.status(200).json({
      status: 200,
      data: rows,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRecaptchaLogs,
};
