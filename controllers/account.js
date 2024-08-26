const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");

module.exports = {

  createAccount: async (req, res, next) => {
    try {
      const {
        user_id,
        account_id,
        total_equiti,
        total_deposit,
        total_balance,
        total_withdraw
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `account_info` (`id`, `user_id`, `total_equiti`,`total_deposit`,`total_balance`, `total_withdraw`) VALUES (?,?,?, ?,?,?)",
        [
          account_id,
          user_id,
          total_equiti,
          total_deposit,
          total_balance,
          total_withdraw
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
        total_equiti,
        total_deposit,
        total_balance,
        total_withdraw
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `account_info` SET `user_id` = ?, `total_equiti` = ?, `total_deposit` = ?, `total_balance` = ?, `total_withdraw` = ? WHERE `id` = ?",
        [
          user_id,
          total_equiti,
          total_deposit,
          total_balance,
          total_withdraw,
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
};
