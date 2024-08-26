const { v4: uuidv4 } = require("uuid");
const DB = require("../dbConnection.js");

const fetchPersonalInfoByID = async (id) => {
  sql = "SELECT * FROM `personal_info` WHERE `userId`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {
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
          userId,
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

  getPersonalInfo: async (req, res, next) => {
    try {
      const user = await fetchPersonalInfoByID(req.params.id);
      if (user.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "personal info not found",
        });
      }
      res.json({
        status: 200,
        personal_info: user[0],
      });
    } catch (err) {
      next(err);
    }
  },

  updatePersonalInfo: async (req, res, next) => {
    try {
      const {
        id,
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
      } = req.body;

      const [result] = await DB.execute(
        "UPDATE `personal_info` SET `first_name` = ?, `last_name` = ?, `phone_no` = ?, `gender` = ?, `dob` = ?, `Nationality` = ?, `street` = ?, `Address` = ?, `State` = ?, `Country` = ? WHERE `id` = ?",
        [
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
          id,
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Personal info not found",
        });
      }

      res.status(200).json({
        status: 200,
        message: "Personal info updated successfully",
      });
    } catch (err) {
      next(err);
    }
  },
};
