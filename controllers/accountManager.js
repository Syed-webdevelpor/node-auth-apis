const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { generateToken, verifyToken } = require("../tokenHandler.js");

const fetchAccountManagerByID = async (id) => {
  sql = "SELECT * FROM `account_managers` WHERE `id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

const fetchAllAccountManagers = async (id) => {
  sql = "SELECT * FROM `account_managers`";
  const [row] = await DB.execute(sql);
  return row;
};

module.exports = {

  createAccountManager: async (req, res, next) => {
    try {
      const {
        name,
        email,
        phone,
        region
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `account_managers` (`id`, `name`,`email`,`phone`, `region`) VALUES (?,?,?, ?,?)",
        [
          uuid,
          name,
          email,
          phone,
          region
        ]
      );
      let verificationToken = null;
      const saltRounds = 10;
      const hashPassword = await bcrypt.hash(Math.random(8), saltRounds);
      const referralCode = crypto.randomBytes(4).toString("hex");
      const [user] = await DB.execute(
        "INSERT INTO `users` (`id`, `email`, `password`, `referral_code`, `affiliation_type`, `username`, `account_nature`, `phoneNumber`, `role`, `is_approved`, `is_verified`, `verification_token`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          uuid,
          email,
          hashPassword,
          referralCode,
          'Direct',
          name,
          'Individual',
          phone,
          'Account Manager',
          false,
          false,
          verificationToken = crypto.randomBytes(32).toString("hex")
        ]
      );
      const access_token = generateToken({ id: uuid });
      const refresh_token = generateToken({ id: uuid }, false);

      const md5Refresh = createHash("md5").update(refresh_token).digest("hex");

      const [result1] = await DB.execute(
        "INSERT INTO `refresh_tokens` (`user_id`,`token`) VALUES (?,?)",
        [id, md5Refresh]
      );

      if (!result1.affectedRows) {
        return res.status(500).json({
          status: 500,
          message: "Failed to whitelist the refresh token.",
        });
      }
      const verificationLink = `https://server.investain.com/api/user/verify?token=${verificationToken}`;
      await sendVerificationEmail(email, verificationLink, name);
      res.status(201).json({
        status: 201,
        message: "account manager and user has been created",
        account_manager_id: uuid,
        access_token
      });
    } catch (err) {
      next(err);
    }
  },

  getAccountManagerById: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const user = await fetchAccountManagerByID(req.params.id);
      if (user.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "account manager not found",
        });
      }
      res.json({
        status: 200,
        account_manager: user[0],
      });
    } catch (err) {
      next(err);
    }
  },

  getAllAccountManagers: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const users = await fetchAllAccountManagers();
      if (users.length === 0) {
        return res.status(404).json({
          status: 404,
          message: "account manager not found",
        });
      }
      res.json({
        status: 200,
        account_managers: users,
      });
    } catch (err) {
      next(err);
    }
  },

  updateAccountManager: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);

      const { id } = req.params;
      const { name, email, phone, region } = req.body;

      // Check if the account manager exists
      const user = await fetchAccountManagerByID(id);
      if (user.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "account manager not found",
        });
      }

      // Update the account manager
      const [result] = await DB.execute(
        "UPDATE `account_managers` SET `name`=?, `email`=?, `phone`=?, `region`=? WHERE `id`=?",
        [name, email, phone, region, id]
      );

      res.status(200).json({
        status: 200,
        message: "account manager updated successfully",
      });
    } catch (err) {
      next(err);
    }
  },

  deleteAccountManager: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);

      const { id } = req.params;

      // Check if the account manager exists
      const user = await fetchAccountManagerByID(id);
      if (user.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "account manager not found",
        });
      }

      // Delete the account manager
      const [result] = await DB.execute(
        "DELETE FROM `account_managers` WHERE `id`=?",
        [id]
      );

      res.status(200).json({
        status: 200,
        message: "account manager deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  },
};