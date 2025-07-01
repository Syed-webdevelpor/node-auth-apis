const { v4: uuidv4 } = require("uuid");
const DB = require("../dbConnection.js");
const { verifyToken } = require("../tokenHandler.js");

const fetchOrganizationalInfoByID = async (id) => {
  sql = "SELECT * FROM `organizational_info` WHERE `user_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {
     createOrganizationalInfo : async (req, res, next) => {
        try {
          const {
            company_name,
            register_number,
            country_of_incorporation,
            nature_of_business,
            government_name,
            international_body,
            parent_company,
            stock_exchange_name,
            origin_of_funds,
            address,
            city,
            post_code,
            county,
            userId, // Assuming you still want to associate this with a user
          } = req.body;
      
          const uuid = uuidv4();
      
          // Insert the new organizational info
          const [result] = await DB.execute(
            `INSERT INTO organizational_info (
              id,
              company_name,
              register_number,
              country_of_incorporation,
              nature_of_business,
              government_name,
              international_body,
              parent_company,
              stock_exchange_name,
              origin_of_funds,
              address,
              city,
              post_code,
              county,
              user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuid,
              company_name,
              register_number,
              country_of_incorporation,
              nature_of_business,
              government_name,
              international_body,
              parent_company,
              stock_exchange_name,
              origin_of_funds,
              address,
              city,
              post_code,
              county,
              userId
            ]
          );
      
          // Update the user's organizational info ID
          await DB.execute(
            "UPDATE users SET organizational_info_id = ? WHERE id = ?",
            [uuid, userId]
          );
      
          res.status(201).json({
            status: 201,
            message: "Your organizational info has been created",
            organizational_info_id: uuid,
          });
        } catch (err) {
          next(err);
        }
      },

  getOrganizationalInfo: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const user = await fetchOrganizationalInfoByID(req.params.id);
      if (user.length !== 1) {
        return res.status(404).json({
          status: 404,
          message: "organizational info not found",
        });
      }
      res.json({
        status: 200,
        organizational_info: user[0],
      });
    } catch (err) {
      next(err);
    }
  },

 updateOrganizationalInfo : async (req, res, next) => {
    try {
      const {
        id, // ID of the organizational info to update
        company_name,
        register_number,
        country_of_incorporation,
        nature_of_business,
        government_name,
        international_body,
        parent_company,
        stock_exchange_name,
        origin_of_funds,
        address,
        city,
        post_code,
        county
      } = req.body;
  
      // Build the update query dynamically
      const updates = [];
      const params = [];
  
      // Add non-JSON fields to the update query
      if (company_name) {
        updates.push("company_name = ?");
        params.push(company_name);
      }
      if (register_number) {
        updates.push("register_number = ?");
        params.push(register_number);
      }
      if (country_of_incorporation) {
        updates.push("country_of_incorporation = ?");
        params.push(country_of_incorporation);
      }
      if (nature_of_business) {
        updates.push("nature_of_business = ?");
        params.push(nature_of_business);
      }
      if (government_name) {
        updates.push("government_name = ?");
        params.push(government_name);
      }
      if (international_body) {
        updates.push("international_body = ?");
        params.push(international_body);
      }
      if (parent_company) {
        updates.push("parent_company = ?");
        params.push(parent_company);
      }
      if (stock_exchange_name) {
        updates.push("stock_exchange_name = ?");
        params.push(stock_exchange_name);
      }
      if (origin_of_funds) {
        updates.push("origin_of_funds = ?");
        params.push(origin_of_funds);
      }
      if (address) {
        updates.push("address = ?");
        params.push(address);
      }
      if (city) {
        updates.push("city = ?");
        params.push(city);
      }
      if (post_code) {
        updates.push("post_code = ?");
        params.push(post_code);
      }
      if (county) {
        updates.push("county = ?");
        params.push(county);
      }
  
      if (updates.length === 0) {
        return res.status(400).json({
          status: 400,
          message: "No fields provided for update.",
        });
      }
  
      // Add the ID to the parameters
      params.push(id);
  
      // Execute the update query
      const [result] = await DB.execute(
        `UPDATE organizational_info SET ${updates.join(", ")} WHERE id = ?`,
        params
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Organization info not found or no changes made.",
        });
      }
  
      res.status(200).json({
        status: 200,
        message: "Organization info updated successfully.",
      });
    } catch (err) {
      next(err);
    }
  }
};
