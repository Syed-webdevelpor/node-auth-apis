const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { generateToken, verifyToken } = require("../tokenHandler.js");
const DB = require("../dbConnection.js");
const { createHash } = crypto;

const fetchUserByEmailOrID = async (data, isEmail) => {
  const column = isEmail ? "email" : "id";
  const [rows] = await DB.execute(
    `SELECT 
         users.id, users.email, users.referral_code, users.subusers, users.created_at, users.updated_at,
         personal_info.first_name, personal_info.last_name, personal_info.phone_no, personal_info.gender, personal_info.dob, personal_info.Nationality, personal_info.street, personal_info.Address, personal_info.State, personal_info.Country,
         financial_info.TIN, financial_info.industry, financial_info.employment_status, financial_info.annual_income, financial_info.value_of_savings, financial_info.total_net_assets, financial_info.source_of_wealth, financial_info.expected_initial_amount_of_depsoit,
         account_info.trading_experience, account_info.platform, account_info.base_currency, account_info.leverage
       FROM users
       LEFT JOIN personal_info ON users.personal_info_id = personal_info.id
       LEFT JOIN financial_info ON users.financial_info_id = financial_info.id
       LEFT JOIN account_info ON users.account_info_id = account_info.id
       WHERE users.${column} = ?`,
    [data]
  );
  return rows;
};
module.exports = {
  fetchUserByEmailOrID: fetchUserByEmailOrID,
  signup: async (req, res, next) => {
    try {
      const { id, email, password, referCode } = req.body;
  
      // Validate input
      if (!email || !password || !id) {
        return res.status(400).json("Missing required fields");
      }
  
      // Hash password
      const saltRounds = 10;
      const hashPassword = await bcrypt.hash(password, saltRounds);
  
      // Generate referral code
      const referralCode = crypto.randomBytes(4).toString("hex");
  
      // Check if user with the given email already exists
      const user = await fetchUserByEmailOrID(email, true);
      if (user.length > 0) {
        return res.status(403).json("Email already exists");
      }
  
      // Determine affiliation type
      let affiliationType = "Direct";
      let referringUser = null;
      let row = null;
  
      if (referCode) {
        // Check if referCode belongs to an introducing broker
        [row] = await DB.execute("SELECT * FROM `introducing_brokers` WHERE `referral_code`=?", [referCode]);
        if (row) {
          affiliationType = "Introduced";
        }
  
        // Check if referCode belongs to another user
        [referringUser] = await DB.execute("SELECT * FROM `users` WHERE `referral_code`=?", [referCode]);
        if (referringUser) {
          affiliationType = "Affiliate";
        }
      }
  
      // Insert new user
      const [result] = await DB.execute(
        "INSERT INTO `users` (`id`, `email`, `password`, `referral_code`, `affiliation_type`) VALUES (?, ?, ?, ?, ?)",
        [id, email, hashPassword, referralCode, affiliationType]
      );
  
      if (referCode) {
        // Update subusers for referring user
        if (referringUser) {
          let subusers = referringUser.subusers ? JSON.parse(referringUser.subusers) : [];
          subusers.push(id);
          await DB.execute("UPDATE `users` SET `subusers` = ? WHERE `id` = ?", [JSON.stringify(subusers), referringUser.id]);
        }
  
        // Update subusers for introducing broker
        if (row) {
          let subusers = row.subusers ? JSON.parse(row.subusers) : [];
          subusers.push(id);
          await DB.execute("UPDATE `introducing_brokers` SET `subusers` = ? WHERE `id` = ?", [JSON.stringify(subusers), row.id]);
        }
      }
  
      // Generate access token
      const access_token = generateToken({ id: id });
      res.status(201).json({
        status: 201,
        message: "You have been successfully registered.",
        user_id: id,
        access_token,
        referral_code: referralCode,
        referred_by: referCode ? referringUser.id : null,
      });
    } catch (err) {
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      const { user, password } = req.body;
      const verifyPassword = await bcrypt.compare(password, user.password);
      if (!verifyPassword) {
        return res.status(422).json({
          status: 422,
          message: "Incorrect password!",
        });
      }

      const access_token = generateToken({ id: user.id });
      const refresh_token = generateToken({ id: user.id }, false);

      const md5Refresh = createHash("md5").update(refresh_token).digest("hex");

      const [result] = await DB.execute(
        "INSERT INTO `refresh_tokens` (`user_id`,`token`) VALUES (?,?)",
        [user.id, md5Refresh]
      );

      if (!result.affectedRows) {
        throw new Error("Failed to whitelist the refresh token.");
      }
      res.json({
        status: 200,
        access_token,
        refresh_token,
      });
    } catch (err) {
      next(err);
    }
  },

  getUser: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);

      const user = await fetchUserByEmailOrID(data.id, false);
      if (user.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "User not found",
        });
      }
      res.json({
        status: 200,
        user: user[0],
      });
    } catch (err) {
      next(err);
    }
  },

  refreshToken: async (req, res, next) => {
    try {
      const refreshToken = req.headers.refresh_token;
      const data = verifyToken(refreshToken, false);
      if (data && data.status) return res.status(data.status).json(data);

      const md5Refresh = createHash("md5").update(refreshToken).digest("hex");

      const [refTokenRow] = await DB.execute(
        "SELECT * from `refresh_tokens` WHERE token=?",
        [md5Refresh]
      );

      if (refTokenRow.length !== 1) {
        return res.json({
          status: 401,
          message: "Unauthorized: Invalid Refresh Token.",
        });
      }

      const access_token = generateToken({ id: data.id });
      const refresh_token = generateToken({ id: data.id }, false);

      const newMd5Refresh = createHash("md5")
        .update(refresh_token)
        .digest("hex");

      const [result] = await DB.execute(
        "UPDATE `refresh_tokens` SET `token`=? WHERE `token`=?",
        [newMd5Refresh, md5Refresh]
      );

      if (!result.affectedRows) {
        throw new Error("Failed to whitelist the Refresh token.");
      }

      res.json({
        status: 200,
        access_token,
        refresh_token,
      });
    } catch (err) {
      next(err);
    }
  },
  getProfile: async (req, res, next) => {
    try {
      const user = await fetchUserByEmailOrID(req.params.userId);
      if (user.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "profile not found",
        });
      }
      res.json({
        status: 200,
        user: user[0],
      });
    } catch (err) {
      next(err);
    }
  },
};
