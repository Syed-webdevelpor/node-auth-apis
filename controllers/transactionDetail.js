const DB = require("../dbConnection.js");
const { verifyToken } = require("../tokenHandler.js");
const { sendTransactionNotificationEmail } = require('../middlewares/sesMail.js');
const { DateTime } = require("luxon");
const axios = require("axios");

const fetchTransactionDetailByUserID = async (id) => {
  const sql = `
    SELECT * 
    FROM \`transaction_details\` 
    WHERE \`user_id\` = ? 
  `;
  const [rows] = await DB.execute(sql, [id]);
  return rows; // Assuming rows will contain all matching records
};

const fetchAllTransactionDetails = async () => {
  sql = "SELECT * FROM `transaction_details`";
  const [row] = await DB.execute(sql);
  return row;
};

module.exports = {

  transactionDetail: async (req, res, next) => {
    const connection = await DB.getConnection();
    try {
      await connection.beginTransaction();

      const {
        transaction_id,
        amount,
        transaction_type,
        status,
        from_type,
        from_id,
        to_type,
        to_id,
        user_id
      } = req.body;

      console.log("Received Transaction:", req.body);

      // Validate input
      if (!transaction_id || !amount || amount <= 0) {
        throw new Error("Invalid transaction data");
      }

      // Prevent duplicate transaction
      const [existing] = await connection.execute(
        "SELECT transaction_id FROM transaction_details WHERE transaction_id = ?",
        [transaction_id]
      );
      console.log("Existing Transaction Rows:", existing);

      if (existing.length > 0) {
        throw new Error("Duplicate transaction");
      }

      // Insert transaction
      const [insertResult] = await connection.execute(
        `INSERT INTO transaction_details
          (transaction_id, user_id, from_type, from_id, to_type, to_id, amount, transaction_type, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [transaction_id, user_id, from_type, from_id, to_type, to_id, amount, transaction_type, status]
      );
      console.log("Inserted Transaction Result:", insertResult);

      // Fetch inserted transaction
      const [transactionRows] = await connection.execute(
        "SELECT * FROM transaction_details WHERE transaction_id = ?",
        [transaction_id]
      );
      console.log("Inserted Transaction Row:", transactionRows);

      const transaction = transactionRows[0];
      if (!transaction) throw new Error("Transaction not found");

      let tradingAccountNumber = null;

      if (transaction.status === "success") {
        // ------------------------------
        // Deposit
        // ------------------------------
        if (transaction_type === "Deposit") {
          console.log("Processing Deposit for account:", to_id);
          await connection.execute(
            "UPDATE account_financials SET balance = balance + ?, deposit = deposit + ? WHERE account_id = ?",
            [amount, amount, to_id]
          );
          tradingAccountNumber = to_id;
        }

        // ------------------------------
        // Withdrawal
        // ------------------------------
        else if (transaction_type === "Withdrawal") {
          console.log("Processing Withdrawal for account:", from_id);
          await connection.execute(
            "UPDATE account_financials SET balance = balance - ?, withdrawal_amount = withdrawal_amount + ? WHERE account_id = ?",
            [amount, amount, from_id]
          );
          tradingAccountNumber = from_id;
        }

        // ------------------------------
        // Transfer
        // ------------------------------
        else if (transaction_type === "Transfer") {
          console.log(`Processing Transfer from ${from_id} (${from_type}) to ${to_id} (${to_type})`);

          if (from_type === "wallet" && to_type === "account") {
            await connection.execute(
              "UPDATE wallets SET balance = balance - ? WHERE wallet_number = ?",
              [amount, from_id]
            );
            await connection.execute(
              "UPDATE account_financials SET balance = balance + ? WHERE account_id = ?",
              [amount, to_id]
            );
            tradingAccountNumber = to_id;
          } else if (from_type === "account" && to_type === "wallet") {
            await connection.execute(
              "UPDATE account_financials SET balance = balance - ? WHERE account_id = ?",
              [amount, from_id]
            );
            await connection.execute(
              "UPDATE wallets SET balance = balance + ? WHERE wallet_number = ?",
              [amount, to_id]
            );
            tradingAccountNumber = from_id;
          } else if (from_type === "account" && to_type === "account") {
            await connection.execute(
              "UPDATE account_financials SET balance = balance - ? WHERE account_id = ?",
              [amount, from_id]
            );
            await connection.execute(
              "UPDATE account_financials SET balance = balance + ? WHERE account_id = ?",
              [amount, to_id]
            );
            tradingAccountNumber = to_id;
          } else if (from_type === "wallet" && to_type === "wallet") {
            await connection.execute(
              "UPDATE wallets SET balance = balance - ? WHERE wallet_number = ?",
              [amount, from_id]
            );
            await connection.execute(
              "UPDATE wallets SET balance = balance + ? WHERE wallet_number = ?",
              [amount, to_id]
            );
            tradingAccountNumber = to_id;
          }
        }

        console.log("Trading Account Number to Sync:", tradingAccountNumber);

        // ------------------------------
        // Sync with Trading Server
        // ------------------------------
        if (tradingAccountNumber) {
          const [financialRows] = await connection.execute(
            "SELECT balance FROM account_financials WHERE account_id = ?",
            [tradingAccountNumber]
          );
          console.log("Financial Rows:", financialRows);

          const updatedBalance = Number(financialRows[0]?.balance || 0);
          console.log("Updated Balance to Sync:", updatedBalance);

          await axios.patch(
            `https://trading.investain.com/trading-accounts/account-number/${tradingAccountNumber}`,
            {
              balance: updatedBalance,
              free_margin: updatedBalance
            },
            {
              headers: {
                "Content-Type": "application/json",
                "x-internal-api-key": process.env.INTERNAL_API_KEY
              },
              timeout: 5000
            }
          );
          console.log("Trading server synced successfully");
        }
      }

      // ------------------------------
      // Fetch user info and send email
      // ------------------------------
      const [userRows] = await connection.execute(
        `SELECT users.id, users.email,personal_info.first_name
        FROM users
        LEFT JOIN personal_info ON users.personal_info_id = personal_info.id
        WHERE users.id = ?`,
        [user_id]
      );

      console.log("Fetched User Info:", userRows);

      const user = userRows[0];
      if (!user) throw new Error("User not found");

      const timestamp = DateTime.now().setZone("Asia/Dubai").toFormat("yyyy/MM/dd HH:mm:ss");
      let account_number = transaction_type === "Deposit" ? to_id :
                          transaction_type === "Withdrawal" ? from_id :
                          `${from_id} to ${to_id}`;

      await sendTransactionNotificationEmail(
        user.email,
        user.first_name,
        transaction_type,
        amount,
        timestamp,
        account_number,
        transaction_id
      );

      await connection.commit();
      console.log("Transaction committed successfully");

      res.status(201).json({
        status: 201,
        message: "Transaction processed successfully",
        transaction_id
      });

    } catch (err) {
      console.error("Transaction Error:", err);
      await connection.rollback();
      next(err);
    } finally {
      connection.release();
    }
  },

  updateTransactionDetail: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const {
        transaction_id,
        user_id,
        from_type,
        from_id,
        to_type,
        to_id,
        amount,
        transaction_type,
        status,
      } = req.body;

      const [result] = await DB.execute(
        "UPDATE `transaction_details` SET `user_id` = ?, `from_type` = ?, `from_id` = ?, `to_type` = ?, `to_id` = ?, `amount` = ?, `transaction_type` = ?, `status` = ? WHERE `transaction_id` = ?",
        [
          user_id,
          from_type,
          from_id,
          to_type,
          to_id,
          amount,
          transaction_type,
          status,
          transaction_id
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Transaction detail not found",
        });
      }

      res.status(200).json({
        status: 200,
        message: "Transaction detail updated successfully",
      });
    } catch (err) {
      next(err);
    }
  },

  getTransactionDetailByUserId: async (req, res, next) => {
    try {
      const transaction_details = await fetchTransactionDetailByUserID(req.params.userId);
      if (transaction_details.length == 0) {
        return res.status(404).json({
          status: 404,
          message: "transaction details not not found",
        });
      }
      res.json({
        status: 200,
        transactionDetail: transaction_details,
      });
    } catch (err) {
      next(err);
    }
  },

  getAllTransactionDetails: async (req, res, next) => {
    try {
      const transaction_details = await fetchAllTransactionDetails();
      if (transaction_details.length == 0) {
        return res.status(404).json({
          status: 404,
          message: "transaction details not not found",
        });
      }
      res.json({
        status: 200,
        transactionDetail: transaction_details,
      });
    } catch (err) {
      next(err);
    }
  },

  getTransactionDetailsByAccManId: async (req, res, next) => {
    try {
      const accManId = req.params.accManId;

      // Get all transaction details for users managed by this account manager
      const [transactionDetails] = await DB.execute(
        `SELECT td.*, u.email, u.username
        FROM transaction_details AS td
        INNER JOIN users AS u ON td.user_id = u.id
        WHERE u.account_manager_id = ?`,
        [accManId]
      );

      if (transactionDetails.length === 0) {
        return res.status(404).json({
          status: 404,
          message: "No transaction details found for this account manager's users",
        });
      }

      res.json({
        status: 200,
        transaction_details: transactionDetails,
        count: transactionDetails.length
      });
    } catch (err) {
      next(err);
    }
  },


};
