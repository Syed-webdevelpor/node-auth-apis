const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { generateToken, verifyToken } = require("../tokenHandler.js");
const DB = require("../dbConnection.js");
const axios = require('axios');
const { DateTime } = require("luxon");
const { createHash } = crypto;
const { sendNotificationToUser } = require("./../middlewares/websocket.js"); 
const { sendVerificationEmail, forgetPasswordEmail, sendOtpEmail, newAccountRegister, sendEmailToAllUsers } = require('../middlewares/sesMail.js')


axios.defaults.baseURL = process.env.SUMSUB_BASE_URL;
// Function to create the signature for Sumsub API requests
function createSignature(config) {
  const ts = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', process.env.SUMSUB_SECRET_KEY)
    .update(ts + config.method.toUpperCase() + config.url)
    .digest('hex');

  config.headers['X-App-Access-Ts'] = ts;
  config.headers['X-App-Access-Sig'] = signature;

  return config;
}

// Intercept all requests to add the signature
axios.interceptors.request.use(createSignature, function (error) {
  return Promise.reject(error);
});

// Function to create an access token
async function createAccessToken(externalUserId, levelName, ttlInSecs = 600) {
  const url = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&ttlInSecs=${ttlInSecs}&levelName=${encodeURIComponent(levelName)}`;

  const headers = {
    'Accept': 'application/json',
    'X-App-Token': process.env.SUMSUB_APP_TOKEN
  };

  return axios.post(url, null, { headers });
}

const fetchUsersByAccManID = async (id) => {
  const [rows] = await DB.execute(
    `SELECT 
         users.id, users.email,users.kyc_completed, users.referral_code,users.username,users.phoneNumber,users.role, users.account_nature, users.is_verified, users.is_approved, users.subusers, users.created_at, users.updated_at, users.support_enable,
         personal_info.first_name, personal_info.last_name, personal_info.gender, personal_info.dob, personal_info.Nationality, personal_info.street, personal_info.Address, personal_info.State, personal_info.Country,
         financial_info.TIN, financial_info.industry, financial_info.employment_status, financial_info.annual_income, financial_info.value_of_savings, financial_info.total_net_assets, financial_info.source_of_wealth, financial_info.expected_initial_amount_of_depsoit,
         account_info.trading_experience, account_info.account_type,account_info.platforms, account_info.base_currency, account_info.leverage
       FROM users
       LEFT JOIN personal_info ON users.personal_info_id = personal_info.id
       LEFT JOIN organizational_info ON users.organizational_info_id = organizational_info.id
       LEFT JOIN financial_info ON users.financial_info_id = financial_info.id
       LEFT JOIN orgFinancialInfo ON users.org_financial_info_id = orgFinancialInfo.id
       LEFT JOIN account_info ON users.account_info_id = account_info.id
       WHERE users.account_manager_id = ?`,
    [id]
  );
  return rows;
};

const fetchAllUsers = async () => {
  const [rows] = await DB.execute(
    `SELECT 
         users.id, users.email,users.kyc_completed, users.referral_code,users.username, users.phoneNumber,users.role,users.account_nature,users.is_verified, users.is_approved, users.subusers, users.current_step, users.created_at, users.updated_at, users.support_enable,
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

const fetchUserByEmailOrID = async (data, isEmail) => {
  const column = isEmail ? "email" : "id";
  const [rows] = await DB.execute(
    `SELECT 
         users.id, users.email,users.password,users.kyc_completed, users.referral_code,users.username,users.phoneNumber,users.role, users.account_nature, users.is_verified, users.is_approved, users.subusers, users.current_step, users.created_at, users.updated_at, users.support_enable,
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
        account_manager_id,
        platform // 'web' or 'mobile'
      } = req.body;
  
      if (!email || !password || !id || !platform) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
  
      const existingUser = await DB.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser[0].length > 0) {
        return res.status(403).json({ message: 'Email already exists' });
      }
  
      const hashPassword = await bcrypt.hash(password, 10);
      const referralCode = crypto.randomBytes(4).toString('hex');
      let affiliationType = 'Direct';
      let referredBy = '';
  
      if (referCode) {
        const [ib] = await DB.execute('SELECT * FROM introducing_brokers WHERE referral_code = ?', [referCode]);
        if (ib.length) {
          affiliationType = 'Introduced';
          referredBy = ib[0].username;
        } else {
          const [refUser] = await DB.execute('SELECT * FROM users WHERE referral_code = ?', [referCode]);
          if (refUser.length) {
            affiliationType = 'Affiliate';
            referredBy = refUser[0].username;
          }
        }
      }
  
      let verificationToken = null;
      let otp = null;
  
      if (platform === 'web') {
        verificationToken = crypto.randomBytes(32).toString('hex');
      } else if (platform === 'mobile') {
        otp = Math.floor(100000 + Math.random() * 900000);
      }
  
      const [insertResult] = await DB.execute(
        `INSERT INTO users (id, email, password, referral_code, affiliation_type, username, account_type, account_nature, phoneNumber, role, is_approved, is_verified, verification_token, otp, otp_created_at, account_manager_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, email, hashPassword, referralCode, affiliationType, username, account_type, account_nature, phoneNumber, role, is_approved, is_verified, verificationToken, otp, platform === 'mobile' ? new Date() : null, account_manager_id]
      );
  
      if (!insertResult.affectedRows) {
        return res.status(500).json({ message: 'User registration failed.' });
      }
  
      if (referCode) {
        const [refUser] = await DB.execute('SELECT * FROM users WHERE referral_code = ?', [referCode]);
        if (refUser.length) {
          let subusers = refUser[0].subusers ? JSON.parse(refUser[0].subusers) : [];
          subusers.push(id);
          await DB.execute('UPDATE users SET subusers = ? WHERE id = ?', [JSON.stringify(subusers), refUser[0].id]);
        }
  
        const [ib] = await DB.execute('SELECT * FROM introducing_brokers WHERE referral_code = ?', [referCode]);
        if (ib.length) {
          let subusers = ib[0].subusers ? JSON.parse(ib[0].subusers) : [];
          subusers.push(id);
          await DB.execute('UPDATE introducing_brokers SET subusers = ? WHERE ib_id = ?', [JSON.stringify(subusers), ib[0].ib_id]);
        }
      }
  
      if (platform === 'web') {
        const link = `https://server.investain.com/api/user/verify?token=${verificationToken}`;
        await sendVerificationEmail(email, link, username);
      } else if (platform === 'mobile') {
        await sendOtpEmail(email, otp, username);
      }
  
      const dubaiTime = DateTime.now().setZone("Asia/Dubai").toFormat("yyyy/MM/dd HH:mm:ss");
      newAccountRegister(id,username,email,phoneNumber,account_type,account_nature,referredBy,dubaiTime)
      const notificationId = `notif_${dubaiTime}_${crypto.randomBytes(4).toString('hex')}`;
  
      await DB.execute(
        `INSERT INTO notifications (id, user_id, message) VALUES (?, ?, ?)`,
        [notificationId, account_manager_id, `${username} has signed up.`]
      );
  
      sendNotificationToUser(account_manager_id.toString(), {
        type: 'new_notification',
        id: notificationId,
        message: `${username} has signed up.`,
        is_read: false,
        created_at: new Date().toISOString()
      });
  
      const access_token = generateToken({ id });
      const refresh_token = generateToken({ id }, false);
      const md5Refresh = crypto.createHash('md5').update(refresh_token).digest('hex');
  
      await DB.execute('INSERT INTO refresh_tokens (user_id, token) VALUES (?, ?)', [id, md5Refresh]);
  
      return res.status(201).json({
        message: 'User registered successfully. Please verify.',
        user_id: id,
        access_token,
        refresh_token,
        referral_code: referralCode,
        account_nature
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal Server Error', error: err.message });
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
      const [userdata] = await DB.execute(
        "SELECT id, is_verified,username,email,account_nature,kyc_completed, current_step FROM users WHERE id = ?",
        [user.id]
      );
      
      if (userdata[0].is_verified === 0) {
              // Generate a new verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationLink = `https://server.investain.com/api/user/verify?token=${verificationToken}`;

      // Update the user's verification token in the database
      const [result] = await DB.execute(
        "UPDATE users SET verification_token = ? WHERE id = ?",
        [verificationToken, userdata[0].id]
      );

      if (!result.affectedRows) {
        throw new Error("Failed to update verification token.");
      }
      await sendVerificationEmail(userdata[0].email, verificationLink,userdata[0].username);
      }
      res.json({
        status: 200,
        access_token,
        refresh_token,
        userId: user.id,
        role: user.role,
        account_nature: user.account_nature,
        is_verified: user.is_verified,
        kyc_completed:user.kyc_completed,
        current_step : user.current_step
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

  getUsersByAccManId: async (req, res, next) => {
    try {

      const user = await fetchUsersByAccManID(req.params.accManId);
      if (user.length === 0) {
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
        "SELECT id, is_verified,username FROM users WHERE email = ?",
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
      await sendVerificationEmail(email, verificationLink,user[0].username);

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
      if (user[0].role == "Introduced Broker") {
        return res.redirect("https://partner.investain.com/dashboard");
      } else {
        return res.redirect("https://portal.investain.com/dashboard");
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
        resetURL = `https://partner.investain.com/reset-password?token=${resetToken}`;
      } else {
        resetURL = `https://portal.investain.com/reset-password?token=${resetToken}`;
      }


      const info = await forgetPasswordEmail(email, resetURL, user[0].username);
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

  changePassword : async (req, res) => {
    const { currentPassword, newPassword, id } = req.body;

    try {
        // Get user from database
        const [user] = await DB.execute('SELECT password FROM users WHERE id = ?', [id]);

        if (!user.length) return res.status(404).json({ message: 'User not found' });

        // Compare current password
        const passwordMatch = await bcrypt.compare(currentPassword, user[0].password);
        if (!passwordMatch) return res.status(400).json({ message: 'Current password is incorrect' });

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password in database
        await DB.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

        res.status(200).json({ message: 'Password changed successfully!' });

    } catch (error) {
        res.status(500).json({ message: 'Error changing password', error });
    }
},
  // Controller function
  kycAccessToken: async (req, res) => {
    const { externalUserId, levelName = 'Live account verification', ttlInSecs = 600 } = req.body;

    if (!externalUserId) {
      return res.status(400).json({ error: 'externalUserId is required' });
    }

    try {
      const response = await createAccessToken(externalUserId, levelName, ttlInSecs);
      res.status(200).json(response.data);
    } catch (error) {
      console.error("Error creating access token:", error);
      res.status(500).json({ message: 'Error creating access token', error: error.response?.data || error.message });
    }
  },

  verifyOtp: async (req, res, next) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          status: 400,
          message: "Missing required fields"
        });
      }

      // Fetch user by email
      const [user] = await DB.execute(
        "SELECT * FROM `users` WHERE `email` = ?",
        [email]
      );

      if (!user || user.length === 0) {
        return res.status(404).json({
          status: 404,
          message: "User not found"
        });
      }

      // Check OTP validity
      const currentTime = new Date();
      const otpExpiryTime = new Date(user[0].otp_created_at);
      otpExpiryTime.setMinutes(otpExpiryTime.getMinutes() + 10); // OTP expires in 10 minutes

      if (user[0].otp !== otp || currentTime > otpExpiryTime) {
        return res.status(400).json({
          status: 400,
          message: "Invalid or expired OTP"
        });
      }

      // Mark user as verified
      await DB.execute("UPDATE `users` SET `is_verified` = ? WHERE `email` = ?", [
        true,
        email,
      ]);

      res.status(200).json({
        status: 200,
        message: "Email verified successfully"
      });
    } catch (err) {
      next(err);
    }
  },

  resendOtp: async (req, res) => {
    try {
      const { email, platform } = req.body;

      // Validate input
      if (!email || !platform) {
        return res.status(400).json({
          status: 400,
          message: "Missing required fields",
        });
      }

      // Check if user exists
      const [user] = await DB.execute("SELECT * FROM `users` WHERE `email` = ?", [email]);

      if (user.length === 0) {
        return res.status(404).json({
          status: 404,
          message: "User not found",
        });
      }

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

      // Update OTP in database
      await DB.execute("UPDATE `users` SET `otp` = ?, `otp_created_at` = ? WHERE `email` = ?", [
        otp,
        new Date(),
        email,
      ]);

      // Send OTP email
      await sendOtpEmail(email, otp,user[0].username);

      res.status(200).json({
        status: 200,
        message: "OTP has been resent successfully",
      });
    } catch (err) {
      res.status(500).json({
        status: 500,
        message: "An unexpected error occurred.",
        error: err.message,
      });
    }
  },

  sendToAllUsers: async (req, res) => {
    const { subject, reply } = req.body;

    try {
      // Get users where role = 'User'
      const [rows] = await DB.execute(`SELECT email FROM users WHERE role = 'User'`);

      // Loop and send email to each user
      const sendResults = await Promise.all(
        rows.map(user => sendEmailToAllUsers(user.email, subject, reply))
      );

      res.status(201).json({ message: 'Emails sent successfully', results: sendResults });
    } catch (err) {
      console.error('Error in sendToAllUsers:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

};
