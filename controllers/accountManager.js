const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { generateToken, verifyToken } = require("../tokenHandler.js");
const { createHash } = crypto;
const { sendVerificationEmail } = require('../middlewares/sesMail.js')

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
    let connection;
    try {
      const { name, email, phone, region } = req.body;
      const uuid = uuidv4();
  
      // 1. Pre-transaction validation checks
      // Check for existing username
      const [existingUsername] = await DB.execute(
        "SELECT id FROM users WHERE username = ?", 
        [name]
      );
      if (existingUsername.length > 0) {
        return res.status(400).json({
          status: 400,
          message: "Username already exists",
          field: "username"
        });
      }
  
      // Check for existing email
      const [existingEmail] = await DB.execute(
        "SELECT id FROM users WHERE email = ?", 
        [email]
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({
          status: 400,
          message: "Email already exists",
          field: "email"
        });
      }
  
      // 2. Start transaction
      connection = await DB.getConnection();
      await connection.beginTransaction();
  
      // 3. Create account manager
      await connection.execute(
        "INSERT INTO `account_managers` (`id`, `name`,`email`,`phone`, `region`) VALUES (?,?,?, ?,?)",
        [uuid, name, email, phone, region]
      );
  
      // 4. Create user
      const saltRounds = 10;
      const hashPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), saltRounds);
      const referralCode = crypto.randomBytes(4).toString("hex");
      const verificationToken = crypto.randomBytes(32).toString("hex");
  
      await connection.execute(
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
          verificationToken
        ]
      );
  
      // 5. Generate and store tokens
      const access_token = generateToken({ id: uuid });
      const refresh_token = generateToken({ id: uuid }, false);
      const md5Refresh = createHash("md5").update(refresh_token).digest("hex");
  
      const [tokenResult] = await connection.execute(
        "INSERT INTO `refresh_tokens` (`user_id`,`token`) VALUES (?,?)",
        [uuid, md5Refresh]
      );
  
      if (!tokenResult.affectedRows) {
        throw new Error("Failed to whitelist the refresh token");
      }
  
      // 6. Commit transaction if all successful
      await connection.commit();
  
      // 7. Send verification email (outside transaction)
      const verificationLink = `https://server.investain.com/api/user/verify?token=${verificationToken}`;
      await sendVerificationEmail(email, verificationLink, name);
  
      return res.status(201).json({
        status: 201,
        message: "Account manager and user created successfully",
        account_manager_id: uuid,
        access_token
      });
  
    } catch (err) {
      // Rollback transaction on any error
      if (connection) await connection.rollback();
      
      console.error("Account Manager Creation Error:", err);
  
      // Handle specific error cases
      if (err.code === 'ER_DUP_ENTRY') {
        if (err.sqlMessage.includes('username')) {
          return res.status(400).json({
            status: 400,
            message: "Username already exists",
            field: "username"
          });
        }
        if (err.sqlMessage.includes('email')) {
          return res.status(400).json({
            status: 400,
            message: "Email already exists",
            field: "email"
          });
        }
        if (err.sqlMessage.includes('phone')) {
          return res.status(400).json({
            status: 400,
            message: "Phone number already exists",
            field: "phone"
          });
        }
      }
  
      // Generic error response
      return res.status(500).json({ 
        status: 500,
        message: "Failed to create account manager",
        error: err.message,
      });
    } finally {
      // Release connection
      if (connection) connection.release();
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