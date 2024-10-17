const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchIntroducingBrokerById = async (id) => {
  sql = "SELECT * FROM `introducing_brokers` WHERE `id`=?";
  const [row] = await DB.execute(sql, [id]);
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
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `introducing_brokers` (`ib_id`, `ib_name`, `email`, `phone_number`) VALUES (?, ?, ?, ?)",
        [
          uuid,
          username,
          email,
          phoneNumber,
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
      if (ib.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "Introducing Broker not found",
        });
      }
      res.json({
        status: 200,
        introducingBroker: ib[0],
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
   
};
