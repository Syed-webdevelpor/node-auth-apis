const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchOrgFinancialInfoByID = async (id) => {
  sql = "SELECT * FROM `orgFinancialInfo` WHERE `userId`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {

  createOrgFinancialInfo: async (req, res, next) => {
    try {
      const {
        annual_revenue,
        net_worth,
        other_assets,
        source_of_funds,
        is_shareholder,
        is_beneficial_owner,
        objective_of_investment,
        userId
      } = req.body;
      
      const uuid = uuidv4();

      const [result] = await DB.execute(
        "INSERT INTO `orgFinancialInfo` (`id`, `annual_revenue`, `net_worth`, `other_assets`, `source_of_funds`, `is_shareholder`, `is_beneficial_owner`, `objective_of_investment`, `expected_initial_amount_of_depsoit`, `userId`) VALUES (?,?,?, ?, ?, ?, ?, ?, ?)",
        [
          uuid,
          annual_revenue,
          net_worth,
          other_assets,
          source_of_funds,
          is_shareholder,
          is_beneficial_owner,
          objective_of_investment,
          userId
        ]
      );
      console.log(uuid);
      await DB.execute(
        "UPDATE `users` SET `organizationalFinancial_info_id` = ? WHERE `id` = ?",
        [uuid, userId]
      );
      res.status(201).json({
        status: 201,
        message: "Your OrganizationalFinancial Info have been created",
        OrganizationalFinancial_info_id: uuid,
      });
    } catch (err) {
      next(err);
    }
  },

  getOrgFinancialInfo: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const user = await fetchOrgFinancialInfoByID(req.params.id);
      if (user.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "OrgFinancial info not found",
        });
      }
      res.json({
        status: 200,
        OrgFinancial_info: user[0],
      });
    } catch (err) {
      next(err);
    }
  },

  updateOrgFinancialInfo: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const {
        annual_revenue,
        net_worth,
        other_assets,
        source_of_funds,
        is_shareholder,
        is_beneficial_owner,
        objective_of_investment,
        userId
      } = req.body;
  
      const [result] = await DB.execute(
        "UPDATE `orgFinancialInfo ` SET `annual_revenue` = ?, `net_worth` = ?, `other_assets` = ?, `source_of_funds` = ?, `is_shareholder` = ?, `is_beneficial_owner` = ?, `objective_of_investment` = ?, WHERE `userId` = ?",
        [
            annual_revenue,
            net_worth,
            other_assets,
            source_of_funds,
            is_shareholder,
            is_beneficial_owner,
            objective_of_investment,
            userId
        ]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "OrgFinancial info not found",
        });
      }
  
      res.status(200).json({
        status: 200,
        message: "OrgFinancial info updated successfully",
      });
    } catch (err) {
      next(err);
    }
  },
    
};
