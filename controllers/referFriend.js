const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchReferFriendByID = async (id) => {
  sql = "SELECT * FROM `refer_friends` WHERE `id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {

  createReferFriend: async (req, res, next) => {
    try {
      const {
        total_invited_friends,
        rewarded_friends,
        total_earning,
        rewards_in_progress,
        userId,
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `refer_friends` (`id`, `total_invited_friends`,`rewarded_friends`,`total_earning`, `rewards_in_progress`,`userId`) VALUES (?,?,?, ?,?,?)",
        [
          uuid,
          total_invited_friends,
          rewarded_friends,
          total_earning,
          rewards_in_progress,
          userId,
        ]
      );
      res.status(201).json({
        status: 201,
        message: "Refer Friend has been created",
        refer_friend_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  }, 

  getReferFriend: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const user = await fetchReferFriendByID(req.params.id);
      if (user.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "Refer Friend not found",
        });
      }
      res.json({
        status: 200,
        refer_friend: user[0],
      });
    } catch (err) {
      next(err);
    }
  },      
};
