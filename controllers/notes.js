const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchNotesByID = async (id) => {
  sql = "SELECT * FROM `interaction_logs` WHERE `user_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {

  createNotes: async (req, res, next) => {
    try {
      const {
        user_id,
        account_manager_id,
        log_text,
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `interaction_logs` (`id`, `user_id`,`account_manager_id`,`log_text`) VALUES (?,  ?,  ?, ?)",
        [
          uuid,
          user_id,
          account_manager_id,
          log_text
        ]
      );
      res.status(201).json({
        status: 201,
        message: "Notes has been created",
        refer_friend_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  }, 

  getNotes: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const note = await fetchNotesByID(req.params.user_id);
      if (note.length === 0) {
        return res.status(404).json({
          status: 404,
          message: "Notes not found for this user",
        });
      }
      res.json({
        status: 200,
        notes: note,
      });
    } catch (err) {
      next(err);
    }
  },      
};
