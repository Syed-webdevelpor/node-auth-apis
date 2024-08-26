const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");

module.exports = {

  transactionDetail: async (req, res, next) => {
    try {
      const {
        user_id,
        account_id,
        amount,
        transaction_type,
        status,
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `account_info` (`id`, `account_id`, `user_id`,`amount`,`transaction_type`, `status`) VALUES (?,?,?, ?,?)",
        [
          uuid,
          account_id,
          user_id,
          amount,
          transaction_type,
          status,
        ]
      );
      res.status(201).json({
        status: 201,
        message: "Your transaction detail have been created",
        transaction_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },

  updateTransactionDetail: async (req, res, next) => {
    try {
      const {
        id,
        account_id,
        user_id,
        amount,
        transaction_type,
        status,
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `transaction_details` SET `account_id` = ?, `user_id` = ?, `amount` = ?, `transaction_type` = ?, `status` = ? WHERE `id` = ?",
        [
          account_id,
          user_id,
          amount,
          transaction_type,
          status,
          id
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
    
};
