const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchAccountManagerByID = async (id) => {
  sql = "SELECT * FROM `account_managers` WHERE `id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

const fetchAllAccountManagers = async (id) => {
    sql = "SELECT * FROM `account_managers`";
    const [row] = await DB.execute(sql);
    return row;
  };

module.exports = {

  createAccountManager: async (req, res, next) => {
    try {
      const {
        name,
        email,
        phone,
        region
      } = req.body;
      const uuid = uuidv4();
      const [result] = await DB.execute(
        "INSERT INTO `account_managers` (`id`, `name`,`email`,`phone`, `region`) VALUES (?,?,?, ?,?)",
        [
          uuid,
          name,
          email,
          phone,
          region
        ]
      );
      res.status(201).json({
        status: 201,
        message: "account manager has been created",
        account_manager_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  }, 

  getAccountManagerById: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const user = await fetchAccountManagerByID(req.params.id);
      if (user.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "account manager not found",
        });
      }
      res.json({
        status: 200,
        account_manager: user[0],
      });
    } catch (err) {
      next(err);
    }
  },      

  getAllAccountManagers: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const users = await fetchAllAccountManagers();
      if (users.length === 0) {
        return res.status(404).json({
          status: 404,
          message: "account manager not found",
        });
      }
      res.json({
        status: 200,
        account_managers: users,
      });
    } catch (err) {
      next(err);
    }
  }, 
};
