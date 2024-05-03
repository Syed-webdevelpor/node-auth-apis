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

const fetchUserByEmailOrID = async (data, isEmail = true) => {
  let sql = "SELECT * FROM `users` WHERE `email`=?";
  if (!isEmail)
    sql =
      "SELECT `id` ,`first_name` ,`last_name` , `email` FROM `users` WHERE `id`=?";
  const [row] = await DB.execute(sql, [data]);
  return row;
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
  createProfile: async (req, res, next) => {
    try {
      const {
        first_name,
        last_name,
        email,
        phone_no,
        gender,
        dob,
        Nationality,
        street,
        Address,
        State,
        Country,
        TIN,
        industry,
        employment_status,
        annual_income,
        value_of_savings,
        total_net_assets,
        source_of_wealth,
        expected_initial_amount_of_deposit,
        number_of_trading_experience,
        platform,
        base_currency,
        leverage,
        user_id,
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `profile` (`id`,`first_name`, `last_name`,`email`, `phone_no`, `gender`, `dob`, `Nationality`, `street`, `Address`, `State`,`Country`, `TIN`, `industry`, `employment_status`, `annual_income`, `value_of_savings`, `total_net_assets`, `source_of_wealth`,expected_initial_amount_of_deposit`, `number_of_trading_experience`,`platform`,`base_currency`,`leverage`,`user_id`) VALUES (?,?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)",
        [
          uuid,
          first_name,
          email,
          last_name,
          phone_no,
          gender,
          dob,
          Nationality,
          street,
          Address,
          State,
          Country,
          TIN,
          industry,
          employment_status,
          annual_income,
          value_of_savings,
          total_net_assets,
          source_of_wealth,
          expected_initial_amount_of_deposit,
          number_of_trading_experience,
          platform,
          base_currency,
          leverage,
          user_id,
        ]
      );
      res.status(201).json({
        status: 201,
        message: "Your profile have been created",
        user_id: uuid,
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
