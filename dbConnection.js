const mysql = require("mysql2");
const dotenv = require("dotenv");
const { config } = dotenv;

const connection = () => {
  config();
  const { DB_HOST, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  return mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
  });
};

module.exports = connection().promise();
