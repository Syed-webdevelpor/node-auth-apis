const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchWalletByID = async (id) => {
  sql = "SELECT * FROM `wallets` WHERE `id`=?";
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
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `wallets` (`id`,`wallet_number`,`currency`, `balance`) VALUES (?,?,?, ?)",
        [
          uuid,
          wallet_number,
          currency,
          balance,
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
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `wallets` SET `wallet_number` = ?, `currency` = ?, `balance` = ? WHERE `id` = ?",
        [
            wallet_number,
            currency,
            balance,
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

  getWalletByID: async (req, res, next) => {
    try {
      const wallets = await fetchWalletByID(req.params.id);
      if (wallets.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "Wallets not found",
        });
      }
      res.json({
        status: 200,
        trading_accounts: wallets[0],
      });
    } catch (err) {
      next(err);
    }
  },
    
};