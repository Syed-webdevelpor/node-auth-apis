const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");

const fetchTradingAccountByID = async (id) => {
  sql = "SELECT * FROM `trading_accounts` WHERE `account_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {

  createAccount: async (req, res, next) => {
    try {
      const {
        user_id,
        account_id,
        account_type,
        account_number,
        account_status,
        account_mode
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `trading_accounts` (`id`, `user_id`, `account_type`,`account_number`,`account_status`, `account_mode`) VALUES (?,?,?, ?,?,?)",
        [
          account_id,
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
        account_id: account_id,
      });
    } catch (err) {
      next(err);
    }
  },

  updateAccount: async (req, res, next) => {
    try {
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
  
  getTradingAccountById: async (req, res, next) => {
    try {
      const trading_accounts = await fetchTradingAccountByID(req.params.id);
      if (trading_accounts.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "Trading account not found",
        });
      }
      res.json({
        status: 200,
        trading_accounts: trading_accounts[0],
      });
    } catch (err) {
      next(err);
    }
  },
};
