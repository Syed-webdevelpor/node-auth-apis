const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchTransactionDetailtByUserID = async (id) => {
  sql = "SELECT * FROM `transaction_details` WHERE `user_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {

  transactionDetail: async (req, res, next) => {
    try {
      const {
        user_id,
        amount,
        transaction_type,
        status,
        from_type,
        from_id,
        to_type,
        to_id, 
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `transaction_details` (`id`, `user_id`,`from_type`,`from_id`,`to_type`,`to_id`,amount`,`transaction_type`, `status`) VALUES (?,?,?, ?,?,?,?,?)",
        [
          uuid,
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
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const {
        id,
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
        "UPDATE `transaction_details` SET `user_id` = ?, `from_type` = ?, `from_id` = ?, `to_type` = ?, `to_id` = ?, `amount` = ?, `transaction_type` = ?, `status` = ? WHERE `id` = ?",
        [
          user_id,
          from_type,
          from_id,
          to_type,
          to_id,
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

  getTransactionDetailByUserId: async (req, res, next) => {
    try {
      const transaction_details = await fetchTransactionDetailtByUserID(req.params.userId);
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
