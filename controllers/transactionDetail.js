const DB = require("../dbConnection.js");
const { verifyToken } = require("../tokenHandler.js");
const { sendTransactionNotificationEmail } = require('../middlewares/sesMail.js')

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
    try {
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
      const [result] = await DB.execute(
        "INSERT INTO `transaction_details` (`transaction_id`, `user_id`,`from_type`,`from_id`,`to_type`,`to_id`, `amount`,`transaction_type`, `status`) VALUES (?,?,?, ?,?,?,?,?,?)",
        [
          transaction_id,
          user_id,
          from_type,
          from_id,
          to_type,
          to_id,
          amount,
          transaction_type,
          status,
        ]
      );
      // Fetch inserted transaction details
      const [transactionRows] = await DB.execute(
        "SELECT * FROM `transaction_details` WHERE `transaction_id` = ?",
        [result.insertId]
      );

      const transaction = transactionRows[0];
      if (!transaction) {
        throw new Error("Transaction not found");
      }
      if(transaction.status === "success"){
         // Update account financials based on transaction type
        if (transaction_type === 'Deposit') {
          await DB.execute(
            "UPDATE `account_financials` SET `balance` = `balance` + ?, `deposit` = `deposit` + ? WHERE `account_id` = ?",
            [amount, amount, to_id]
          );
        } 
        else if (transaction_type === 'Withdrawal') {
          await DB.execute(
            "UPDATE `account_financials` SET `balance` = `balance` - ?, `withdrawal_amount` = `withdrawal_amount` + ? WHERE `account_id` = ?",
            [amount, amount, from_id]
          );
        } 
        else if (transaction_type === 'Transfer') {

          if(from_type === 'wallet' && to_type ==='account'){
          // Deduct from sender account
          await DB.execute(
            "UPDATE `wallets` SET `balance` = `balance` - ? WHERE `wallet_number` = ?",
            [amount, from_id]
          );

          // Add to receiver account
          await DB.execute(
            "UPDATE `account_financials` SET `balance` = `balance` + ? WHERE `account_id` = ?",
            [amount, to_id]
          );
          }else if(from_type === 'account' && to_type ==='wallet'){
            // Deduct from sender account
          await DB.execute(
            "UPDATE `account_financials` SET `balance` = `balance` - ? WHERE `account_id` = ?",
            [amount, from_id]
          );

          // Add to receiver account
          await DB.execute(
            "UPDATE `wallets` SET `balance` = `balance` + ? WHERE `wallet_number` = ?",
            [amount, to_id]
          );
          }else if(from_type === 'wallet' && to_type ==='wallet'){
            // Deduct from sender account
            await DB.execute(
              "UPDATE `wallets` SET `balance` = `balance` - ? WHERE `wallet_number` = ?",
              [amount, from_id]
            );

          // Add to receiver account
          await DB.execute(
            "UPDATE `wallets` SET `balance` = `balance` + ? WHERE `wallet_number` = ?",
            [amount, to_id]
          );
          }else{
            await DB.execute(
              "UPDATE `account_financials` SET `balance` = `balance` - ? WHERE `account_id` = ?",
              [amount, from_id]
            );

            await DB.execute(
              "UPDATE `account_financials` SET `balance` = `balance` + ? WHERE `account_id` = ?",
              [amount, to_id]
            );
          }
          
        }
      }
       

      // Fetch user details
      const [rows] = await DB.execute(
        `SELECT 
       users.id, users.email,
       personal_info.first_name
   FROM users
   LEFT JOIN personal_info ON users.personal_info_id = personal_info.id
   WHERE users.id = ?`,
        [user_id]
      );

      const user = rows[0];
      if (!user) {
        throw new Error("User not found");
      }

      let account_number = '';
      if (transaction_type === 'Deposit') {
        account_number = from_id;
        await sendTransactionNotificationEmail(rows[0].email, rows[0].first_name, transaction_type, amount, transaction.created_at, account_number, transaction_id)
      } else if (transaction_type === 'Withdrawal') {
        account_number = to_id;
        await sendTransactionNotificationEmail(rows[0].email, rows[0].first_name, transaction_type, amount, transaction.created_at, account_number, transaction_id)
      } else if (transaction_type === 'Transfer') {
        account_number = `${from_id} to ${to_id}.`;
        await sendTransactionNotificationEmail(rows[0].email, rows[0].first_name, transaction_type, amount, transaction.created_at, account_number, transaction_id, from_id, to_id)
      }

      res.status(201).json({
        status: 201,
        message: "Your transaction detail have been created",
        transaction_id: transaction_id,
      });
    } catch (err) {
      next(err);
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

};
