const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");
const { wss } = require("./../middlewares/websocket.js"); // Import the WebSocket server
const WebSocket = require('ws');

const fetchAllaccountFinancial = async () => {
  sql = "SELECT * FROM `account_financials`";
  const [row] = await DB.execute(sql);
  return row;
};

const fetchaccountFinancialByUserID = async (id) => {
  sql = "SELECT * FROM `account_financials` WHERE `userId`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

const fetchaccountFinancialByAccountId = async (id) => {
  sql = "SELECT * FROM `account_financials` WHERE `account_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

// Function to send data to clients every 10 seconds
const startBroadcasting = () => {
  setInterval(async () => {
    wss.clients.forEach(async (client) => {
      if (client.readyState === WebSocket.OPEN) {
        const userId = client.userId; // Extract userId from the client object
        
        if (userId) {
          try {
            const accountFinancials = await fetchaccountFinancialByUserID(userId);          
            if (accountFinancials.length > 0) {
              client.send(JSON.stringify({
                type: 'ACCOUNT_FINANCIAL_UPDATE',
                data: accountFinancials
              }));
            }
          } catch (error) {
            console.error('Error fetching account financial data:', error);
          }
        } else {
          console.error('userId is undefined for client');
        }
      }
    });
  }, 10000); // 10 seconds
};
// Start broadcasting
startBroadcasting();

module.exports = {

  createAccountFinancial: async (req, res, next) => {
    try {
      const {
        account_id,
        equity,
        credit,
        balance,
        margin,
        platforms,
        withdrawal_amount,
        leverage,
        deposit,
        currency,
        userId
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `account_financials` (`id`, `account_id`, `equity`, `credit`,`balance`,`margin`,`platforms`,`withdrawal_amount`,`leverage`,`deposit`,`currency`, `userId`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          uuid,
          account_id,
          equity,
          credit,
          balance,
          margin,
          platforms,
          withdrawal_amount,
          leverage,
          deposit,
          currency,
          userId
        ]
      );
      res.status(201).json({
        status: 201,
        message: "Your Account financial has been created",
        accountsFinancial_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },

  getAllAccountFinancial: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const accountFinancial = await fetchAllaccountFinancial();
      if (accountFinancial.length == 0) {
        return res.status(404).json({
          status: 404,
          message: "account Financials not found",
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

  getAccountFinancial: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const accountFinancial = await fetchaccountFinancialByUserID(req.params.userId);
      if (accountFinancial.length == 0) {
        return res.status(404).json({
          status: 404,
          message: "account Financial not found",
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

  getAccountFinancialByAccountId: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const accountFinancial = await fetchaccountFinancialByAccountId(req.params.accountId);
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
        platforms,
        deposit,
        currency,
        account_id
      } = req.body;

      const [result] = await DB.execute(
        "UPDATE `account_financials` SET `equity` = ?, `credit` = ?, `withdrawal_amount` = ?, `leverage` = ?, `deposit` = ?, `currency` = ?, `platforms` = ?, `userId` = ? WHERE `account_id` = ?",
        [
          equity,
          credit,
          withdrawal_amount,
          leverage,
          deposit,
          currency,
          platforms,
          userId,
          account_id
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