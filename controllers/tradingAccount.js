const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { DateTime } = require("luxon");
const { verifyToken } = require("../tokenHandler.js");
const { sendNotificationToUser } = require("./../middlewares/websocket.js"); 
const { sendTradingAccountEmail, sendNewTradingAccountReqEmail, sendNewTradingAccountEmail, sendNewTradingAccountReqToAccManagerEmail } = require('../middlewares/sesMail.js')
const axios = require('axios');

const fetchAllTradingAccount = async () => {
  sql = `
      SELECT 
      ta.id AS trading_account_id,
      ta.*, 
      af.id AS financial_id,
      af.*
    FROM trading_accounts ta
    LEFT JOIN account_financials af 
      ON af.account_id = ta.account_number
      AND af.id = (
        SELECT id 
        FROM account_financials 
        WHERE account_id = ta.account_number
        ORDER BY created_at DESC 
        LIMIT 1
      );`;
  const [row] = await DB.execute(sql);
  return row;
};

const fetchTradingAccountByUserID = async (id) => {
  const sql = `
        SELECT 
          ta.id AS trading_account_id,
          ta.*, 
          af.id AS financial_id,
          af.* 
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
        initial_balance,
        leverage,
        custom_spread,
        custom_swap_long,
        custom_swap_short,
        account_mode
      } = req.body;

      // Step 1: Get user data from user table
      const [userRows] = await DB.execute(
        `SELECT 
            users.id, users.email, users.password, users.role,
            personal_info.first_name, personal_info.last_name,
            account_info.leverage AS user_leverage
        FROM users
        LEFT JOIN personal_info ON users.personal_info_id = personal_info.id
        LEFT JOIN account_info ON users.account_info_id = account_info.id
        WHERE users.id = ?`,
        [user_id]
      );

      if (userRows.length === 0) {
        return res.status(404).json({
          status: 404,
          message: "User not found",
        });
      }

      const user = userRows[0];
      const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim();

      // Step 2: Call external API to create user on trading server
      const externalApiUrl = process.env.TRADING_SERVER_URL || 'https://trading.investain.com';
      
      const registerPayload = {
        name: userName || user.email.split('@')[0],
        email: user.email,
        password: user.password || crypto.randomBytes(8).toString('hex'),
        role: 'trader',
        account_type: account_type || 'Standard',
        initial_balance: initial_balance || 0,
        leverage: leverage || 100,
        custom_spread: custom_spread || null,
        custom_swap_long: custom_swap_long || null,
        custom_swap_short: custom_swap_short || null
      };

      let tradingServerResponse;
      try {
        tradingServerResponse = await axios.post(
          `${externalApiUrl}/auth/register`,
          registerPayload,
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
      } catch (apiError) {
        console.error('Trading server API error:', apiError.response?.data || apiError.message);
        return res.status(502).json({
          status: 502,
          message: "Failed to create account on trading server",
          error: apiError.response?.data?.message || apiError.message
        });
      }

      // Step 3: Extract data from trading server response
      const tradingUser = tradingServerResponse.data.user;
      const tradingAccountData = tradingServerResponse.data.tradingAccount;
      const tokens = tradingServerResponse.data.tokens;
      
      const account_number = tradingAccountData?.accountNumber || tradingUser?.id;

      // Step 4: Create trading account record in local database using API response
      const uuid = tradingAccountData?.id || uuidv4();
      await DB.execute(
        "INSERT INTO `trading_accounts` (`id`, `user_id`, `account_type`,`account_number`,`account_status`, `account_mode`) VALUES (?,?,?, ?,?,?)",
        [
          uuid,
          user_id,
          tradingAccountData?.group?.name || account_type || 'Standard',
          account_number,
          tradingAccountData?.status || 'active',
          account_mode || 'live'
        ]
      );

      // Step 5: Create account financial record in local database using API response
      const financialUuid = uuidv4();
      const balance = tradingAccountData?.balance || 0;
      const equity = tradingAccountData?.equity || balance;
      const marginUsed = tradingAccountData?.marginUsed || 0;
      const currency = tradingAccountData?.group?.currency || 'USD';
      const leverageValue = tradingAccountData?.group?.leverage || leverage || user.user_leverage || 100;

      await DB.execute(
        `INSERT INTO account_financials 
        (id, account_id, equity, credit, balance, margin, platforms, withdrawal_amount, leverage, deposit, currency, userId) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          financialUuid,
          account_number,
          equity,
          0,
          balance,
          marginUsed,
          'INVESTAiN',
          0,
          leverageValue,
          balance,
          currency,
          user_id
        ]
      );

      // Send email notification
      let link;
      if (user.role == "Introduced Broker") {
        link = "https://partner.investain.com/dashboard";
      } else {
        link = "https://portal.investain.com/dashboard";
      }
      sendTradingAccountEmail(user.email, user.first_name, account_type, account_number, link, leverage || user.user_leverage);

      res.status(201).json({
        status: 201,
        message: "Your Account has been created",
        account_id: uuid,
        account_number: account_number,
        trading_user: tradingUser,
        tokens: tokens
      });
    } catch (err) {
      console.error('Error in createAccount:', err);
      next(err);
    }
  },

updateAccount: async (req, res, next) => {
  try {
    const data = verifyToken(req.headers.access_token);
    if (data && data.status) return res.status(data.status).json(data);

    const { id, ...fields } = req.body;

    if (!id) {
      return res.status(400).json({
        status: 400,
        message: "Account ID is required",
      });
    }

    const allowedFields = [
      "user_id",
      "account_type",
      "account_number",
      "account_status",
      "account_mode"
    ];

    const keys = Object.keys(fields).filter(key => allowedFields.includes(key));

    if (keys.length === 0) {
      return res.status(400).json({
        status: 400,
        message: "No valid fields provided for update",
      });
    }

    const setClause = keys.map(key => `\`${key}\` = ?`).join(", ");
    const values = keys.map(key => fields[key]);

    const [result] = await DB.execute(
      `UPDATE trading_accounts SET ${setClause} WHERE id = ?`,
      [...values, id]
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
               users.id, users.email, users.role, users.account_manager_id,
               personal_info.first_name
           FROM users
           LEFT JOIN personal_info ON users.personal_info_id = personal_info.id
           WHERE users.id = ?`,
        [user_id]
      );
      if (rows.length === 0) {
        return res.status(400).json({
          status: 400,
          message: "user not found",
        })
      }
      const [accManager] = await DB.execute(
        `SELECT * FROM account_managers WHERE id = ?`,
        [rows[0].account_manager_id]
      );
      const accountManager = accManager[0];
      await sendNewTradingAccountEmail(rows[0].first_name, rows[0].email);
      await sendNewTradingAccountReqToAccManagerEmail(accountManager.email, user_id, platform, currency, account_type, reason);
      // Send Notification
      const timestamp = DateTime.now().setZone("Asia/Dubai").toFormat("yyyy/MM/dd HH:mm:ss");
      const notificationId = `notif_${timestamp}_${crypto.randomBytes(4).toString("hex")}`;

      const notificationMessage = `${rows[0].id} requested a new trading account (${currency}, ${account_type})`;

      await DB.execute(
        `INSERT INTO notifications (id, user_id, message) VALUES (?, ?, ?)`,
        [notificationId, accountManager.id, notificationMessage]
      );

      sendNotificationToUser(accountManager.id.toString(), {
        type: "new_notification",
        id: notificationId,
        message: notificationMessage,
        is_read: false,
        user_id: rows[0].id,
        created_at: new Date().toISOString()
      });

      const data = await sendNewTradingAccountReqEmail(user_id, platform, currency, account_type, reason);

      res.status(201).json({
        status: 201,
        message: data,
      });
    } catch (err) {
      next(err);
    }
  },

getTradingAccountsByAccManId: async (req, res, next) => {
  try {
    // Get all trading accounts with financial info for users of this account manager
    const [tradingAccounts] = await DB.execute(
      `SELECT ta.*, af.*, u.email, u.username 
       FROM trading_accounts AS ta
       LEFT JOIN account_financials AS af ON ta.account_number = af.account_id
       LEFT JOIN users AS u ON ta.user_id = u.id
       WHERE u.account_manager_id = ?`,
      [req.params.accManId]
    );

    if (tradingAccounts.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "No trading accounts found for this account manager's users",
      });
    }

    res.json({
      status: 200,
      trading_accounts: tradingAccounts,
      count: tradingAccounts.length
    });
  } catch (err) {
    next(err);
  }
},
};
