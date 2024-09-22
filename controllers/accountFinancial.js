const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");

const fetchaccountFinancialByID = async (id) => {
  sql = "SELECT * FROM `account_financials` WHERE `account_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};
module.exports = {

  createAccountFinancial: async (req, res, next) => {
    try {
      const {
        account_id,
        equity,
        credit,
        withdrawal_amount,
        leverage,
        userId
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `account_financials` (`id`, `account_id`, `equity`, `credit`,`withdrawal_amount`,`leverage`, `user_id`) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          uuid,
          account_id,
          equity,
          credit,
          withdrawal_amount,
          leverage,
          userId
        ]
      );
      res.status(201).json({
        status: 201,
        message: "Your Accounts Info have been created",
        accountsFinancial_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },

  getAccountFinancial: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const accountFinancial = await fetchaccountFinancialByID(req.params.id);
      if (accountFinancial.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "account Financial not found",
        });
      }
      res.json({
        status: 200,
        accountFinancial: accountFinancial[0],
      });
    } catch (err) {
      next(err);
    }
  },

  updateAccountFinancial: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const {
        userId,
        equity,
        credit,
        withdrawal_amount,
        leverage,
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `account_financials` SET `equity` = ?, `credit` = ?, `withdrawal_amount` = ?, `leverage` = ? WHERE `userId` = ?",
        [
          equity,
          credit,
          withdrawal_amount,
          leverage,
          userId
        ]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Account Financial not found",
        });
      }
  
      res.status(200).json({
        status: 200,
        message: "Account Financial updated successfully",
      });
    } catch (err) {
      next(err);
    }
  },
   
};
