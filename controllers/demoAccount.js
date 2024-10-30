const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchDemoByID = async (id) => {
  sql = "SELECT * FROM `demo_accounts` WHERE `id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {

  addDemoAccount: async (req, res, next) => {
    try {
      const {
        firstName,
        lastName,
        email,
        country,
        phoneNumber,
        experience,
        expectedInvestment
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `demo_accounts` (`id`,`firstName`,`lastName`,`email`, `country`,`phoneNumber`,`experience`,`expectedInvestment`) VALUES (?,?,?,?,?,?,?,?)",
        [
          uuid,
          firstName,
          lastName,
          email,
          country,
          phoneNumber,
          experience,
          expectedInvestment
        ]
      );
      res.status(201).json({
        status: 201,
        message: "Your Demo Account has been created",
        demo_account_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },

  updateDemoAccount: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const {
        id,
        firstName,
        lastName,
        email,
        country,
        phoneNumber,
        experience,
        expectedInvestment
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `demo_accounts` SET `firstName` = ?, `lastName` = ?, `email` = ? , `country` = ? ,`phoneNumber` = ? , `experience` = ?, `expectedInvestment` = ? WHERE `id` = ?",
        [
            firstName,
            lastName,
            email,
            country,
            phoneNumber,
            experience,
            expectedInvestment,
          id
        ]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Demo Account not found",
        });
      }
  
      res.status(200).json({
        status: 200,
        message: "Demo Account updated successfully",
      });
    } catch (err) {
      next(err);
    }
  }, 

  getDemoByID: async (req, res, next) => {
    try {
      const recent_activities = await fetchDemoByID(req.params.id);
      if (recent_activities.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "demo account not found",
        });
      }
      res.json({
        status: 200,
        demo_account: recent_activities[0],
      });
    } catch (err) {
      next(err);
    }
  },
    
};
