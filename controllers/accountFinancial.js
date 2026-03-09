const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");
const { wss } = require("./../middlewares/websocket.js"); // Import the WebSocket server
const WebSocket = require('ws');
const axios = require('axios');

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
      
      const { account_id, credit, reason } = req.body;

      if (!account_id) {
        return res.status(400).json({
          status: 400,
          message: "account_id is required",
        });
      }

      if (credit === undefined) {
        return res.status(400).json({
          status: 400,
          message: "credit is required to update",
        });
      }

      // Get current credit from database before update
      const [currentFinancial] = await DB.execute(
        "SELECT `credit` FROM `account_financials` WHERE `account_id` = ?",
        [account_id]
      );

      const currentCredit = currentFinancial.length > 0 ? parseFloat(currentFinancial[0].credit) || 0 : 0;
      const newCredit = parseFloat(credit);

      // Determine action based on credit comparison
      let action = null;
      let amount = 0;
      
      if (newCredit !== currentCredit) {
        if (newCredit > currentCredit) {
          action = 'add';
          amount = newCredit - currentCredit;
        } else if (newCredit < currentCredit) {
          action = 'remove';
          amount = currentCredit - newCredit;
        }
      }

      // Update only credit field
      const [result] = await DB.execute(
        "UPDATE `account_financials` SET `credit` = ? WHERE `account_id` = ?",
        [newCredit, account_id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Account Financial not found",
        });
      }

      // Call external trading server API to update credit
      if (action && amount > 0) {
        try {
          const tradingServerUrl = process.env.TRADING_SERVER_URL || 'http://localhost:3000';
          
          const externalApiResponse = await axios.post(
            `${tradingServerUrl}/trading-accounts/credit/${account_id}`,
            { 
              action, 
              amount, 
              reason: reason || 'Credit update via account financial API' 
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'x-internal-api-key': process.env.INTERNAL_API_KEY
              }
            }
          );

          const externalData = externalApiResponse.data;
          
          if (externalApiResponse.status !== 200) {
            console.error('External trading server credit update failed:', externalData.message || 'Failed to manage credit');
          }
        } catch (externalApiError) {
          console.error('Error calling external trading server API:', externalApiError.message);
        }
      }

      res.status(200).json({
        status: 200,
        message: "Account Financial credit updated successfully",
      });
    } catch (err) {
      next(err);
    }
  },

  // Get credit history of a trading account for admin
  getCreditHistory: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);

      const { accountId } = req.params;

      if (!accountId) {
        return res.status(400).json({
          status: 400,
          message: "accountId is required",
        });
      }

      const tradingServerUrl = process.env.TRADING_SERVER_URL || 'http://localhost:3000';
      
      const externalApiResponse = await axios.get(
        `${tradingServerUrl}/trading-accounts/credit-history/${accountId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': process.env.INTERNAL_API_KEY
          }
        }
      );
      console.log(`log are here: ${externalApiResponse}`);

      const externalData = externalApiResponse.data;

      if (externalApiResponse.status !== 200) {
        return res.status(externalApiResponse.status || 500).json({
          status: externalApiResponse.status || 500,
          message: externalData.message || 'Failed to fetch credit history from trading server',
        });
      }

      res.status(200).json({
        status: 200,
        creditHistory: externalData,
      });
    } catch (err) {
      next(err);
    }
  },
};
