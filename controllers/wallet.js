const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchWalletByUserID = async (id) => {
  sql = "SELECT * FROM `wallets` WHERE `userId`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {

  wallet: async (req, res, next) => {
    try {
      const {
        wallet_number,
        currency,
        balance,
        userId,
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `wallets` (`id`,`wallet_number`,`currency`, `balance`, `userId`) VALUES (?,?,?, ?,?)",
        [
          uuid,
          wallet_number,
          currency,
          balance,
          userId
        ]
      );
      res.status(201).json({
        status: 201,
        message: "Your Wallet have been created",
        transaction_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },

  updateWallet: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const {
        id,
        wallet_number,
        currency,
        balance,
        userId,
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `wallets` SET `wallet_number` = ?, `currency` = ?, `balance` = ?, `userId` = ? WHERE `id` = ?",
        [
            wallet_number,
            currency,
            balance,
            userId,
          id
        ]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Wallet not found",
        });
      }
  
      res.status(200).json({
        status: 200,
        message: "Wallet updated successfully",
      });
    } catch (err) {
      next(err);
    }
  }, 

  getWalletByUserID: async (req, res, next) => {
    try {
      const wallets = await fetchWalletByUserID(req.params.userId);
      if (wallets.length === 0) {
        return res.status(404).json({
          status: 404,
          message: "Wallets not found",
        });
      }
      res.json({
        status: 200,
        trading_accounts: wallets,
      });
    } catch (err) {
      next(err);
    }
  },
    
};
