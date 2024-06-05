const bcrypt = require("bcrypt");
const crypto = require("crypto");
const expressValidator = require("express-validator");
const { generateToken, verifyToken } = require("./tokenHandler.js");
const DB = require("./dbConnection.js");
const { v4: uuidv4 } = require("uuid");

const { validationResult } = expressValidator;
const { createHash } = crypto;
const validation_result = validationResult.withDefaults({
  formatter: (error) => error.msg,
});

const validate = (req, res, next) => {
  const errors = validation_result(req).mapped();
  if (Object.keys(errors).length) {
    return res.status(422).json({
      status: 422,
      errors,
    });
  }
  next();
};

const fetchUserByEmailOrID = async (data, isEmail) => {
  const column = isEmail ? 'email' : 'id';
  const [rows] = await DB.execute(
    `SELECT 
       users.id, users.email, users.created_at, users.updated_at,
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
const fetchProfileByID = async (id) => {
  sql = "SELECT * FROM `profile` WHERE `user_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};
module.exports = {
  validate: validate,
  fetchUserByEmailOrID: fetchUserByEmailOrID,
  signup: async (req, res, next) => {
    try {
      const { id, email, password } = req.body;

      const saltRounds = 10;
      const hashPassword = await bcrypt.hash(password, saltRounds);
      const user = await fetchUserByEmailOrID(email, true);
      if (user.length >= 1) {
        return res.status(403).json("Email Already Exist");
      }
      const [result] = await DB.execute(
        "INSERT INTO `users` (`id`, `email`, `password`) VALUES (?, ?, ?)",
        [id, email, hashPassword]
      );
      res.status(201).json({
        status: 201,
        message: "You have been successfully registered.",
        user_id: id,
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
  createPersonalInfo: async (req, res, next) => {
    try {
      const {
        first_name,
        last_name,
        phone_no,
        gender,
        dob,
        Nationality,
        street,
        Address,
        State,
        Country,
        userId,
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `personal_info` (`id`,`first_name`, `last_name`, `phone_no`, `gender`, `dob`, `Nationality`, `street`, `Address`, `State`,`Country`, `userId`) VALUES (?,?,?,?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          uuid,
          first_name,
          last_name,
          phone_no,
          gender,
          dob,
          Nationality,
          street,
          Address,
          State,
          Country,
          userId
        ]
      );
      await DB.execute(
        "UPDATE `users` SET `personal_info_id` = ? WHERE `id` = ?",
        [uuid, userId]
      );
      res.status(201).json({
        status: 201,
        message: "Your Personal info have been created",
        personal_info_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },
  createFinancialInfo: async (req, res, next) => {
    try {
      const {
        TIN,
        industry,
        employment_status,
        annual_income,
        value_of_savings,
        total_net_assets,
        source_of_wealth,
        expected_initial_amount_of_deposit,
        userId
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `financial_info` (`id`, `TIN`, `industry`, `employment_status`, `annual_income`, `value_of_savings`, `total_net_assets`, `source_of_wealth`,expected_initial_amount_of_deposit`, `userId`) VALUES (?,?,?,?, ?, ?, ?, ?, ?, ?)",
        [
          uuid,
          TIN,
          industry,
          employment_status,
          annual_income,
          value_of_savings,
          total_net_assets,
          source_of_wealth,
          expected_initial_amount_of_deposit,
          userId
        ]
      );
      await DB.execute(
        "UPDATE `users` SET `personal_info_id` = ? WHERE `id` = ?",
        [uuid, userId]
      );
      res.status(201).json({
        status: 201,
        message: "Your Financial Info have been created",
        financial_info_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },
  createAccountInfo: async (req, res, next) => {
    try {
      const {
        trading_experience,
        platform,
        base_currency,
        leverage,
        userId
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `account_info` (`id`, `trading_experience`,`platform`,`base_currency`,`leverage`, `userId`) VALUES (?,?,?,?, ?, ?, ?)",
        [
          uuid,
          trading_experience,
          platform,
          base_currency,
          leverage,
          userId
        ]
      );
      await DB.execute(
        "UPDATE `users` SET `personal_info_id` = ? WHERE `id` = ?",
        [uuid, userId]
      );
      res.status(201).json({
        status: 201,
        message: "Your Accounts Info have been created",
        accounts_info_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },
  transactionDetail: async (req, res, next) => {
    try {
      const {
        user_id,
        account_id,
        amount,
        transaction_type,
        status,
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `account_info` (`id`, `account_id`, `user_id`,`amount`,`transaction_type`, `status`) VALUES (?,?,?, ?,?)",
        [
          uuid,
          account_id,
          user_id,
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
        account_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },
  getProfile: async (req, res, next) => {
    try {
      const user = await fetchProfileByID(req.params.userId);
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
