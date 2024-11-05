const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchDemoAccountFinancialByUserID = async (id) => {
  sql = "SELECT * FROM `demo_account_financials` WHERE `user_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};
module.exports = {

  createDemoAccountFinancial: async (req, res, next) => {
    try {
      const {
        account_id,
        leverage, 
        equity,
        balance,
        margin,
        platforms,
        currency,
        userId
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `demo_account_financials` (`id`, `account_id`, `equity`, `balance`,`margin`,`platforms`,`leverage`, `currency`, `user_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          uuid,
          account_id,
          equity,
          balance,
          margin,
          platforms,
          leverage,
          currency,
          userId
        ]
      );
      res.status(201).json({
        status: 201,
        message: "Your Demo Account financial has been created",
        DemoAccountsFinancial_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },

  getDemoAccountFinancial: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const accountFinancial = await fetchDemoAccountFinancialByUserID(req.params.userId);
      if (accountFinancial.length == 0) {
        return res.status(404).json({
          status: 404,
          message: "demo account Financial not found",
        });
      }
      res.json({
        status: 200,
        accountFinancial: accountFinancial,
      });
    } catch (err) {
      next(err);
    }
  },

  updateDemoAccountFinancial: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const {
        userId,
        leverage, 
        equity,
        balance,
        margin,
        platforms,
        currency,
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `demo_account_financials` SET `equity` = ?, `leverage` = ?, `balance` = ?, `margin` = ?, `platforms` = ?, `currency` = ? WHERE `userId` = ?",
        [
        equity,
        leverage, 
        balance,
        margin,
        platforms,
        currency,
        userId
        ]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Demo Account Financial not found",
        });
      }
  
      res.status(200).json({
        status: 200,
        message: "Demo Account Financial updated successfully",
      });
    } catch (err) {
      next(err);
    }
  },
   
};
