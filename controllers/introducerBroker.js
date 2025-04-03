const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");
const crypto = require("crypto");
const { sendNewIbEmail, sendIbReqEmail } = require('../middlewares/sesMail.js')

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
    try {
      const {
        username,
        email,
        phoneNumber,
        password,
      } = req.body;
      // Generate referral code
        const referralCode = crypto.randomBytes(4).toString("hex");
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `introducing_brokers` (`ib_id`, `ib_name`, `email`, `phone_number`, `referral_code`) VALUES (?, ?, ?, ?, ?)",
        [
          uuid,
          username,
          email,
          phoneNumber,
          referralCode
        ]
      );
if (result) {
next();
}
    } catch (err) {
      next(err);
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
                  users.id, users.email, users.phoneNumber, users.username
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
