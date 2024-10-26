const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchRecentActivityByUserID = async (id) => {
  sql = "SELECT * FROM `recent_activities` WHERE `userId`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {

  recentActivity: async (req, res, next) => {
    try {
      const {
        userId,
        description,
        date,
        status,
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `recent_activities` (`id`,`userId`,`description`,`date`, `status`) VALUES (?,?,?, ?,?)",
        [
          uuid,
          userId,
          description,
          date,
          status,
        ]
      );
      res.status(201).json({
        status: 201,
        message: "Your Recent Activity has been created",
        transaction_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },

  updateRecentActivity: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const {
        id,
        userId,
        description,
        date,
        status,
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `recent_activities` SET `userId` = ?, `description` = ?, `date` = ? , `status` = ? WHERE `id` = ?",
        [
            userId,
        description,
        date,
        status,
          id
        ]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Recent Activity not found",
        });
      }
  
      res.status(200).json({
        status: 200,
        message: "Recent Activity updated successfully",
      });
    } catch (err) {
      next(err);
    }
  }, 

  getRecentActivityByUserID: async (req, res, next) => {
    try {
      const recent_activities = await fetchRecentActivityByUserID(req.params.id);
      if (recent_activities.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "Recent Activity not found",
        });
      }
      res.json({
        status: 200,
        trading_accounts: recent_activities[0],
      });
    } catch (err) {
      next(err);
    }
  },
    
};
