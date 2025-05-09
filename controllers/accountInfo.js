const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");
const { applicationSubmissionEmail } = require('../middlewares/sesMail.js')

const fetchaccountInfoByID = async (id) => {
  sql = "SELECT * FROM `account_info` WHERE `userId`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};
module.exports = {

  createAccountInfo: async (req, res, next) => {
    try {
      const {
        trading_experience,
        account_type,
        platforms,
        base_currency,
        leverage,
        userId
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `account_info` (`id`, `trading_experience`,`account_type`,`base_currency`,`leverage`, `platforms`, `userId`) VALUES (?,?,?,?, ?, ?,?)",
        [
          uuid,
          trading_experience,
          account_type,
          base_currency,
          leverage,
          platforms,
          userId
        ]
      );
      await DB.execute(
        "UPDATE `users` SET `account_info_id` = ? WHERE `id` = ?",
        [uuid, userId]
      );
      const [user] = await DB.execute(
        "SELECT * FROM `users` WHERE `id` = ?",
        [userId]
      );
      let link;
      if (user[0].role == "Introduced Broker") {
        link = "https://partner.investain.com/dashboard";
      } else {
        link = "https://portal.investain.com/dashboard";
      }
      await applicationSubmissionEmail(user[0].email, link, user[0].username);
      res.status(201).json({
        status: 201,
        message: "Your Accounts Info have been created",
        accounts_info_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },

  getAccountInfo: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const user = await fetchaccountInfoByID(req.params.id);
      if (user.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "account info not found",
        });
      }
      res.json({
        status: 200,
        account_info: user[0],
      });
    } catch (err) {
      next(err);
    }
  },

  updateAccountInfo: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const {
        userId,
        trading_experience,
        account_type,
        base_currency,
        platforms,
        leverage,
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `account_info` SET `trading_experience` = ?, `account_type` = ?, `base_currency` = ?, `leverage` = ?, `platforms`= ? WHERE `userId` = ?",
        [
          trading_experience,
          account_type,
          base_currency,
          leverage,
          platforms,
          userId
        ]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Account info not found",
        });
      }
  
      res.status(200).json({
        status: 200,
        message: "Account info updated successfully",
      });
    } catch (err) {
      next(err);
    }
  },
   
};
