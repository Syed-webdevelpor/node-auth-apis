const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");
const { sendTradingAccountEmail, sendNewTradingAccountReqEmail, sendNewTradingAccountEmail } = require('../middlewares/sesMail.js')

const fetchAllTradingAccount = async () => {
  sql =  `
  SELECT ta.*, af.* 
  FROM trading_accounts AS ta
  LEFT JOIN account_financials AS af 
  ON ta.account_number = af.account_id`;
  const [row] = await DB.execute(sql);
  return row;
};

const fetchTradingAccountByUserID = async (id) => {
  const sql = `
    SELECT ta.*, af.* 
    FROM trading_accounts AS ta
    LEFT JOIN account_financials AS af 
    ON ta.account_number = af.account_id 
    WHERE ta.user_id = ?`;

  const [rows] = await DB.execute(sql, [id]);
  return rows;
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
      
      const [rows] = await DB.execute(
        `SELECT 
             users.id, users.email, users.role,
             personal_info.first_name
         FROM users
         LEFT JOIN personal_info ON users.personal_info_id = personal_info.id
         WHERE users.id = ?`,
        [user_id]
      );
      let link;
      if (rows[0].role == "Introduced Broker") {
        link = "https://partner.investain.com/dashboard";
      } else {
        link = "https://portal.investain.com/dashboard";
      }
        sendTradingAccountEmail(rows[0].email,rows[0].first_name,account_type,account_number, link)
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
        trading_accounts: trading_accounts
      });
    } catch (err) {
      next(err);
    }
  },

  newTradingAccountReqEmail: async (req, res, next) => {
    try {
        const {
          user_id,
          platform,
          currency,
          account_type,
          reason
        } = req.body;
        const [rows] = await DB.execute(
          `SELECT 
               users.id, users.email, users.role,
               personal_info.first_name
           FROM users
           LEFT JOIN personal_info ON users.personal_info_id = personal_info.id
           WHERE users.id = ?`,
          [user_id]
        );
        if(rows.length === 0){
         return res.status(400).json({
            status: 400,
            message: "user not found",
          })
        }
        await sendNewTradingAccountEmail(rows[0].first_name, rows[0].email)
        const data = await sendNewTradingAccountReqEmail(user_id, platform, currency, account_type, reason);
        res.status(201).json({
            status: 201,
            message: data,
        });
    } catch (err) {
        next(err);
    }
},
};
