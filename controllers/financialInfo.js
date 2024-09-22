const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");

const fetchFinancialInfoByID = async (id) => {
  sql = "SELECT * FROM `financial_info` WHERE `userId`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {

  createFinancialInfo: async (req, res, next) => {
    try {
      const {
        TIN,
        industry,
        employment_status,
        annual_income,
        value_of_savings,
        total_net_assets,
        source_of_wealth,
        expected_initial_amount_of_depsoit,
        userId
      } = req.body;
      
      const uuid = uuidv4();

      const [result] = await DB.execute(
        "INSERT INTO `financial_info` (`id`, `TIN`, `industry`, `employment_status`, `annual_income`, `value_of_savings`, `total_net_assets`, `source_of_wealth`, `expected_initial_amount_of_depsoit`, `userId`) VALUES (?,?,?,?, ?, ?, ?, ?, ?, ?)",
        [
          uuid,
          TIN,
          industry,
          employment_status,
          annual_income,
          value_of_savings,
          total_net_assets,
          source_of_wealth,
          expected_initial_amount_of_depsoit,
          userId
        ]
      );
      console.log(uuid);
      await DB.execute(
        "UPDATE `users` SET `financial_info_id` = ? WHERE `id` = ?",
        [uuid, userId]
      );
      res.status(201).json({
        status: 201,
        message: "Your Financial Info have been created",
        financial_info_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },

  getFinancialInfo: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const user = await fetchFinancialInfoByID(req.params.id);
      if (user.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "financial info not found",
        });
      }
      res.json({
        status: 200,
        financial_info: user[0],
      });
    } catch (err) {
      next(err);
    }
  },

  updateFinancialInfo: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const {
        userId,
        TIN,
        industry,
        employment_status,
        annual_income,
        value_of_savings,
        total_net_assets,
        source_of_wealth,
        expected_initial_amount_of_depsoit,
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `financial_info` SET `TIN` = ?, `industry` = ?, `employment_status` = ?, `annual_income` = ?, `value_of_savings` = ?, `total_net_assets` = ?, `source_of_wealth` = ?, `expected_initial_amount_of_depsoit` = ? WHERE `userId` = ?",
        [
          TIN,
          industry,
          employment_status,
          annual_income,
          value_of_savings,
          total_net_assets,
          source_of_wealth,
          expected_initial_amount_of_depsoit,
          userId
        ]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Financial info not found",
        });
      }
  
      res.status(200).json({
        status: 200,
        message: "Financial info updated successfully",
      });
    } catch (err) {
      next(err);
    }
  },
    
};
