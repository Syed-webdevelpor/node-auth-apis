const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchAllTradingAccount = async () => {
  sql = "SELECT * FROM `trading_accounts`";
  const [row] = await DB.execute(sql);
  return row;
};

const fetchTradingAccountByUserID = async (id) => {
  sql = "SELECT * FROM `trading_accounts` WHERE `user_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {

  createAccount: async (req, res, next) => {
    try {
      const {
        user_id,
        account_type,
        account_number,
        account_status,
        account_mode
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `trading_accounts` (`id`, `user_id`, `account_type`,`account_number`,`account_status`, `account_mode`) VALUES (?,?,?, ?,?,?)",
        [
          uuid,
          user_id,
          account_type,
          account_number,
          account_status,
          account_mode
        ]
      );
      res.status(201).json({
        status: 201,
        message: "Your Account has been created",
        account_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },

  updateAccount: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const {
        id,
        user_id,
        account_type,
        account_number,
        account_status,
        account_mode
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `trading_accounts` SET `user_id` = ?, `account_type` = ?, `account_number` = ?, `account_status` = ?, `account_mode` = ? WHERE `id` = ?",
        [
          user_id,
          account_type,
          account_number,
          account_status,
          account_mode,
          id
        ]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Account not found",
        });
      }
  
      res.status(200).json({
        status: 200,
        message: "Account updated successfully",
      });
    } catch (err) {
      next(err);
    }
  },   
  
  getAllTradingAccount: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const trading_accounts = await fetchAllTradingAccount();
      if (trading_accounts.length === 0) {
        return res.status(404).json({
          status: 404,
          message: "Trading accounts not found",
        });
      }
      res.json({
        status: 200,
        trading_accounts: trading_accounts,
      });
    } catch (err) {
      next(err);
    }
  },

  getTradingAccountByUserId: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const trading_accounts = await fetchTradingAccountByUserID(req.params.userId);
      if (trading_accounts.length == 0) {
        return res.status(404).json({
          status: 404,
          message: "Trading accounts not found",
        });
      }
      res.json({
        status: 200,
        trading_accounts: trading_accounts,
      });
    } catch (err) {
      next(err);
    }
  },
};
