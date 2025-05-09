const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken, generateToken } = require("../tokenHandler.js");
const crypto = require("crypto");
const { createHash } = crypto;
const bcrypt = require("bcrypt");
const { sendNewIbEmail, sendIbReqEmail, sendVerificationEmail } = require('../middlewares/sesMail.js')

const fetchIntroducingBrokerById = async (id) => {
  const sql = "SELECT * FROM `introducing_brokers` WHERE `ib_id`=?";
  const [rows] = await DB.execute(sql, [id]);

  if (rows.length === 0) {
    return null; // Return null if no broker is found
  }

  const broker = rows[0];

  // Assuming `subusers` is stored as a JSON array in the database
  if (broker.subusers && broker.subusers.length > 0) {
    const subuserIds = JSON.parse(broker.subusers); // Parse JSON string to an array
    if (Array.isArray(subuserIds) && subuserIds.length > 0) {
      const placeholders = subuserIds.map(() => "?").join(", "); // Prepare placeholders for IN clause
      const subuserSql = `SELECT * FROM \`users\` WHERE \`id\` IN (${placeholders})`;
      const [subuserRows] = await DB.execute(subuserSql, subuserIds);
      broker.subusers = subuserRows; // Replace subuser IDs with detailed subuser objects
    }
  }

  return broker;
};


const fetchAllIntroducingBroker = async () => {
  sql = "SELECT * FROM `introducing_brokers`";
  const [row] = await DB.execute(sql);
  return row;
};

module.exports = {

  createIntroducingBroker: async (req, res, next) => {
    let connection;
    try {
      const { username, email, phoneNumber, password } = req.body;
      
      // Validate required fields
      if (!username || !email || !phoneNumber || !password) {
        return res.status(400).json({ 
          status: 400,
          message: 'Missing required fields',
          fields: {
            username: !username ? 'Username is required' : undefined,
            email: !email ? 'Email is required' : undefined,
            phoneNumber: !phoneNumber ? 'Phone number is required' : undefined,
            password: !password ? 'Password is required' : undefined
          }
        });
      }
  
      // Pre-transaction duplicate checks
      const [existingUsername] = await DB.execute(
        "SELECT ib_id FROM introducing_brokers WHERE ib_name = ?", 
        [username]
      );
      if (existingUsername.length > 0) {
        return res.status(400).json({
          status: 400,
          message: "Username already exists",
          field: "username"
        });
      }
  
      const [existingEmail] = await DB.execute(
        "SELECT ib_id FROM introducing_brokers WHERE email = ?", 
        [email]
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({
          status: 400,
          message: "Email already exists",
          field: "email"
        });
      }
  
      const [existingPhone] = await DB.execute(
        "SELECT ib_id FROM introducing_brokers WHERE phone_number = ?", 
        [phoneNumber]
      );
      if (existingPhone.length > 0) {
        return res.status(400).json({
          status: 400,
          message: "Phone number already exists",
          field: "phoneNumber"
        });
      }
  
      // Get database connection and start transaction
      connection = await DB.getConnection();
      await connection.beginTransaction();
  
      // Generate IDs and codes
      const uuid = uuidv4();
      const referralCode = crypto.randomBytes(4).toString("hex");
      const hashPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(32).toString("hex");
  
      // 1. Create introducing broker
      await connection.execute(
        "INSERT INTO `introducing_brokers` (`ib_id`, `ib_name`, `email`, `phone_number`, `referral_code`) VALUES (?, ?, ?, ?, ?)",
        [uuid, username, email, phoneNumber, referralCode]
      );
  
      // 2. Create user account
      const [insertResult] = await connection.execute(
        `INSERT INTO users (
          id, email, password, referral_code, affiliation_type, 
          username, account_type, account_nature, phoneNumber, role, 
          is_approved, is_verified, verification_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid, 
          email, 
          hashPassword, 
          referralCode, 
          'Direct',
          username,
          'IB',
          'Individual',
          phoneNumber,
          'Introducing Broker',
          false,
          false,
          verificationToken
        ]
      );
  
      if (!insertResult.affectedRows) {
        throw new Error('User registration failed');
      }
  
      // 3. Generate tokens
      const access_token = generateToken({ id: uuid });
      const refresh_token = generateToken({ id: uuid }, false);
      const md5Refresh = crypto.createHash('md5').update(refresh_token).digest('hex');
  
      // 4. Store refresh token
      await connection.execute(
        'INSERT INTO refresh_tokens (user_id, token) VALUES (?, ?)', 
        [uuid, md5Refresh]
      );
  
      // Commit transaction if all operations succeeded
      await connection.commit();
  
      // Send verification email (outside transaction)
      const verificationLink = `https://server.investain.com/api/user/verify?token=${verificationToken}`;
      await sendVerificationEmail(email, verificationLink, username);
  
      // Send success response
      return res.status(201).json({
        status: 201,
        message: 'Introducing broker and user account created successfully',
        data: {
          ib_id: uuid,
          access_token,
          refresh_token,
          referral_code: referralCode
        }
      });
  
    } catch (err) {
      // Roll back transaction if any error occurs
      if (connection) await connection.rollback();
      
      console.error('Error creating introducing broker:', err);
  
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
            field: "phoneNumber"
          });
        }
      }
  
      // Generic error response
      return res.status(500).json({ 
        status: 500,
        message: 'Failed to create introducing broker',
        error: err.message ,
        details: err.stack
      });
    } finally {
      // Release connection back to pool
      if (connection) connection.release();
    }
  },

  getIntroducingBroker: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const ib = await fetchIntroducingBrokerById(req.params.id);
      if (!ib) {
        return res.status(404).json({
          status: 404,
          message: "Introducing Broker not found",
        });
      }
      res.json({
        status: 200,
        introducingBroker: ib,
      });
    } catch (err) {
      next(err);
    }
  },

  getAllintroducingBroker: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);

      const user = await fetchAllIntroducingBroker();
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

  updateIntroducingBroker: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const {
        id,
        ib_name,
        email,
        phone_number,
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `introducing_brokers` SET `ib_name` = ?, `email` = ?, `phone_number` = ? WHERE `id` = ?",
        [
            ib_name,
            email,
            phone_number,
          id
        ]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Introducing Broker not found",
        });
      }
  
      res.status(200).json({
        status: 200,
        message: "Introducing Broker updated successfully",
      });
    } catch (err) {
      next(err);
    }
  },
     newIbReqEmail: async (req, res, next) => {
       try {
           const {
             user_id,
             country,
           } = req.body;
           const [rows] = await DB.execute(
             `SELECT 
                  users.id, users.email, users.phoneNumber, users.username,
                  personal_info.first_name
              FROM users
              LEFT JOIN personal_info ON users.personal_info_id = personal_info.id
              WHERE users.id = ?`,
             [user_id]
           );
           if(rows.length === 0){
            return res.status(400).json({
               status: 400,
               message: "user not found",
             })
           }
           await sendNewIbEmail(rows[0].first_name, rows[0].email)
           const data = await sendIbReqEmail(rows[0].username, rows[0].email, rows[0].phoneNumber, country);
           res.status(201).json({
               status: 201,
               message: data,
           });
       } catch (err) {
           next(err);
       }
   },
};
