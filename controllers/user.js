const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { generateToken, verifyToken } = require("../tokenHandler.js");
const DB = require("../dbConnection.js");
const { createHash } = crypto;
const { sendVerificationEmail, forgetPasswordEmail } = require('../middlewares/sesMail.js')

const fetchUserByEmailOrID = async (data, isEmail) => {
  const column = isEmail ? "email" : "id";
  const [rows] = await DB.execute(
    `SELECT 
         users.id, users.email,users.password, users.referral_code,users.username,users.phoneNumber,users.role, users.account_nature, users.is_verified, users.is_approved, users.subusers, users.created_at, users.updated_at,
         personal_info.first_name, personal_info.last_name, personal_info.gender, personal_info.dob, personal_info.Nationality, personal_info.street, personal_info.Address, personal_info.State, personal_info.Country,
         financial_info.TIN, financial_info.industry, financial_info.employment_status, financial_info.annual_income, financial_info.value_of_savings, financial_info.total_net_assets, financial_info.source_of_wealth, financial_info.expected_initial_amount_of_depsoit,
         account_info.trading_experience, account_info.account_type,account_info.platforms, account_info.base_currency, account_info.leverage
       FROM users
       LEFT JOIN personal_info ON users.personal_info_id = personal_info.id
       LEFT JOIN organizational_info ON users.organizational_info_id = organizational_info.id
       LEFT JOIN financial_info ON users.financial_info_id = financial_info.id
       LEFT JOIN orgFinancialInfo ON users.org_financial_info_id = orgFinancialInfo.id
       LEFT JOIN account_info ON users.account_info_id = account_info.id
       WHERE users.${column} = ?`,
    [data]
  );
  return rows;
};

const fetchAllUsers = async () => {
  const [rows] = await DB.execute(
    `SELECT 
         users.id, users.email,users.password, users.referral_code,users.username, users.phoneNumber,users.role,users.account_nature,users.is_verified, users.is_approved, users.subusers, users.created_at, users.updated_at,
         personal_info.first_name, personal_info.last_name, personal_info.gender, personal_info.dob, personal_info.Nationality, personal_info.street, personal_info.Address, personal_info.State, personal_info.Country,
         financial_info.TIN, financial_info.industry, financial_info.employment_status, financial_info.annual_income, financial_info.value_of_savings, financial_info.total_net_assets, financial_info.source_of_wealth, financial_info.expected_initial_amount_of_depsoit,
         account_info.trading_experience, account_info.account_type,account_info.platforms, account_info.base_currency, account_info.leverage
       FROM users
       LEFT JOIN personal_info ON users.personal_info_id = personal_info.id
            LEFT JOIN organizational_info ON users.organizational_info_id = organizational_info.id
       LEFT JOIN financial_info ON users.financial_info_id = financial_info.id
       LEFT JOIN orgFinancialInfo ON users.org_financial_info_id = orgFinancialInfo.id
       LEFT JOIN account_info ON users.account_info_id = account_info.id`
  );
  return rows;
};
module.exports = {
  fetchUserByEmailOrID: fetchUserByEmailOrID,
  signup: async (req, res, next) => {
    try {
      const {
        id,
        email,
        password,
        referCode,
        username,
        account_type,
        account_nature,
        phoneNumber,
        role,
        is_approved,
        is_verified,
      } = req.body;

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
        [row] = await DB.execute(
          "SELECT * FROM `introducing_brokers` WHERE `referral_code`=?",
          [referCode]
        );
        if (row.length !== 0) {
          affiliationType = "Introduced";
        } else {
          // Check if referCode belongs to another user
          [referringUser] = await DB.execute(
            "SELECT * FROM `users` WHERE `referral_code`=?",
            [referCode]
          );
          if (referringUser) {
            affiliationType = "Affiliate";
          }
        }
      }
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationLink = `https://server.investain.com/api/user/verify?token=${verificationToken}`;
      // Insert new user
      const [result] = await DB.execute(
        "INSERT INTO `users` (`id`, `email`, `password`, `referral_code`, `affiliation_type`, `username`, `account_type`, `account_nature`, `phoneNumber`,`role`, `is_approved`, `is_verified`, `verification_token`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          email,
          hashPassword,
          referralCode,
          affiliationType,
          username,
          account_type,
          account_nature,
          phoneNumber,
          role,
          is_approved,
          is_verified,
          verificationToken
        ]
      );

      if (referCode) {
        // Update subusers for referring user
        if (referringUser) {
          let subusers = referringUser.subusers
            ? JSON.parse(referringUser.subusers)
            : [];
          subusers.push(id);
          await DB.execute("UPDATE `users` SET `subusers` = ? WHERE `id` = ?", [
            JSON.stringify(subusers),
            referringUser[0].id,
          ]);
        }

        // Update subusers for introducing broker
        if (row.length !== 0) {
          let subusers = row.subusers ? JSON.parse(row.subusers) : [];
          subusers.push(id);
          await DB.execute(
            "UPDATE `introducing_brokers` SET `subusers` = ?  WHERE `ib_id` = ?",
            [JSON.stringify(subusers), row[0].ib_id]
          );
        }
      }
      await sendVerificationEmail(email, verificationLink);
      // Generate access token
      const access_token = generateToken({ id: id });
      const refresh_token = generateToken({ id: id }, false);

      const md5Refresh = createHash("md5").update(refresh_token).digest("hex");

      const [result1] = await DB.execute(
        "INSERT INTO `refresh_tokens` (`user_id`,`token`) VALUES (?,?)",
        [id, md5Refresh]
      );

      if (!result1.affectedRows) {
        throw new Error("Failed to whitelist the refresh token.");
      }
      res.status(201).json({
        status: 201,
        message: "You have been successfully registered. Please verify your email.",
        user_id: id,
        access_token,
        refresh_token,
        referral_code: referralCode,
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
        userId: user.id,
        role: user.role,
        account_nature: user.account_nature,
        is_verified: user.is_verified
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

  getAllUsers: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);

      const user = await fetchAllUsers();
      if (user.length == 0) {
        return res.status(404).json({
          status: 404,
          message: "User not found",
        });
      }
      res.json({
        status: 200,
        user: user,
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
  logout: async (req, res, next) => {
    try {
      const refreshToken = req.headers.refresh_token;

      // Validate and decode the refresh token
      const data = verifyToken(refreshToken, false);
      if (data && data.status) return res.status(data.status).json(data);

      // Hash the refresh token for comparison in the database
      const md5Refresh = createHash("md5").update(refreshToken).digest("hex");

      // Delete the refresh token from the database
      const [result] = await DB.execute(
        "DELETE FROM `refresh_tokens` WHERE `token` = ?",
        [md5Refresh]
      );

      if (!result.affectedRows) {
        return res.status(400).json({
          status: 400,
          message: "Failed to log out. Token not found or already invalid.",
        });
      }

      // Successfully logged out
      res.json({
        status: 200,
        message: "Successfully logged out.",
      });
    } catch (err) {
      next(err);
    }
  },

  updateUser: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const id = req.params.id;
      const { ...updateFields } = req.body;

      if (!id || Object.keys(updateFields).length === 0) {
        return res.status(400).json({
          status: 400,
          message: "User ID and at least one field to update are required",
        });
      }

      // Prepare dynamic SQL query
      const updates = [];
      const values = [];

      Object.entries(updateFields).forEach(([key, value]) => {
        updates.push(`\`${key}\` = ?`);
        values.push(value);
      });

      values.push(id); // Add the `id` as the last value for the WHERE clause

      const query = `UPDATE \`users\` SET ${updates.join(
        ", "
      )} WHERE \`id\` = ?`;

      const [result] = await DB.execute(query, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "User not found",
        });
      }

      res.status(200).json({
        status: 200,
        message: "User updated successfully",
      });
    } catch (err) {
      next(err);
    }
  },

  resendVerificationLink: async (req, res, next) => {
    try {
      const { email } = req.body;

      // Validate email
      if (!email) {
        return res.status(400).json({ status: 400, message: "Email is required" });
      }

      // Check if the user exists
      const [user] = await DB.execute(
        "SELECT id, is_verified FROM users WHERE email = ?",
        [email]
      );

      if (user.length === 0) {
        return res.status(404).json({ status: 404, message: "User not found" });
      }

      // Check if the user is already verified
      if (user[0].is_verified) {
        return res.status(400).json({
          status: 400,
          message: "User is already verified. No need to resend the verification link.",
        });
      }

      // Generate a new verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationLink = `https://server.investain.com/api/user/verify?token=${verificationToken}`;

      // Update the user's verification token in the database
      const [result] = await DB.execute(
        "UPDATE users SET verification_token = ? WHERE id = ?",
        [verificationToken, user[0].id]
      );

      if (!result.affectedRows) {
        throw new Error("Failed to update verification token.");
      }

      // Send the verification email
      await sendVerificationEmail(email, verificationLink);

      res.status(200).json({
        status: 200,
        message: "Verification link resent successfully. Please check your email.",
      });
    } catch (err) {
      next(err);
    }
  },


  verifyEmail: async (req, res, next) => {
    const { token } = req.query;

    try {
      if (!token) {
        return res
          .status(400)
          .send("Verification token is missing or invalid.");
      }

      // Fetch the user with the matching token
      const [user] = await DB.execute(
        "SELECT * FROM `users` WHERE `verification_token` = ?",
        [token]
      );

      if (!user || user.length === 0) {
        return res
          .status(400)
          .send("Invalid or expired verification token.");
      }

      // Update user to set `is_verified` to true and clear the verification token
      await DB.execute(
        "UPDATE `users` SET `is_verified` = ?, `verification_token` = NULL WHERE `id` = ?",
        [true, user[0].id]
      );
      console.log(user[0].role);
      if (user[0].role === 'Introduced Broker') {
        return res.redirect("https://partner.investain.com/live-account/step1");
      } else {
        if (user[0].account_nature === 'Individual') {

          return res.redirect("https://portal.investain.com/live-account/step1");
        } else {
          return res.redirect("https://portal.investain.com/live-account/organization/step1")
        }
      }

      // Redirect to a success page
    } catch (error) {
      console.error("Error during verification:", error);

      // Redirect to a failure page
      res.redirect("https://portal.investain.com/login");
    }
  },

  forgetPassword: async (req, res) => {
    const { email } = req.body;

    try {
      // Check if user exists
      const [user] = await DB.execute('SELECT * FROM users WHERE email = ?', [email]);
      if (!user.length) return res.status(404).json({ message: 'User not found' });

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetExpires = new Date(Date.now() + 900000); // 1 hour from now

      // Update user with token and expiration
      await DB.execute(
        'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE email = ?',
        [hashedToken, resetExpires, email]
      );
      let resetURL = "";
      if (user[0].role == "Introduced Broker") {
        resetURL = `https://partner.investain.com/forget-password?token=${resetToken}`;
      } else {
        resetURL = `https://portal.investain.com/forget-password?token=${resetToken}`;
      }


      const info = await forgetPasswordEmail(email, resetURL);
      if (info) {
        res.status(200).json({ message: 'Reset password email sent successfully!' });
      } else {
        res.status(500).json({ message: 'Error sending reset password email', error });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error sending reset password email', error });
    }
  },

  resetPassword: async (req, res) => {
    const { token, newPassword } = req.body;

    try {
      // Hash the token and find the user
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const [user] = await DB.execute(
        'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > ?',
        [hashedToken, new Date()]
      );

      if (!user.length) return res.status(400).json({ message: 'Invalid or expired token' });

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user's password and clear reset fields
      await DB.execute(
        'UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
        [hashedPassword, user[0].id]
      );

      res.status(200).json({ message: 'Password updated successfully!' });
    } catch (error) {
      res.status(500).json({ message: 'Error resetting password', error });
    }
  },
};
