const { v4: uuidv4 } = require("uuid");
const DB = require("../dbConnection.js");
const { verifyToken } = require("../tokenHandler.js");

const fetchOrganizationaOwnershiplInfoByID = async (id) => {
  sql = "SELECT * FROM `organizationOwnershipInfo` WHERE `organizational_info_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

module.exports = {
     createOrganizationalOwnershipInfo : async (req, res, next) => {
        try {
          const {
            organizational_info_id,
            role,
            title,
            first_name,
            last_name,
            email,
            phone_number,
            country,
            source_of_funds,
            source_of_funds_other,
            percentage_of_shares,
            city,
            post_code,
          } = req.body;
      
          const uuid = uuidv4();
      
          // Insert the new organizational info
          const [result] = await DB.execute(
            `INSERT INTO organizationOwnershipInfo (
            id,
            organizational_info_id,
            role,
            title,
            first_name,
            last_name,
            email,
            phone_number,
            country,
            source_of_funds,
            source_of_funds_other,
            percentage_of_shares,
            city,
            post_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
            uuid,
            organizational_info_id,
            role,
            title,
            first_name,
            last_name,
            email,
            phone_number,
            country,
            source_of_funds,
            source_of_funds_other,
            percentage_of_shares,
            city,
            post_code,
            ]
          );
      

      
          res.status(201).json({
            status: 201,
            message: "Your organizational ownership info has been created",
            organizationOwnershipInfo_id: uuid,
          });
        } catch (err) {
          next(err);
        }
      },

  getOrganizationalOwnershipInfo: async (req, res, next) => {
    try {
      const data = verifyToken(req.headers.access_token);
      if (data && data.status) return res.status(data.status).json(data);
      const user = await fetchOrganizationaOwnershiplInfoByID(req.params.id);
      if (user.length === 0) {
        return res.status(404).json({
          status: 404,
          message: "organizational Ownership info not found",
        });
      }
      res.json({
        status: 200,
        organizationalOwnershipInfo: user,
      });
    } catch (err) {
      next(err);
    }
  },

 updateOrganizationalOwnershipInfo : async (req, res, next) => {
    try {
      const {
        id, // ID of the organizational info to update
        role,
        title,
        first_name,
        last_name,
        email,
        phone_number,
        country,
        source_of_funds,
        source_of_funds_other,
        percentage_of_shares,
        city,
        post_code,
      } = req.body;
  
      // Build the update query dynamically
      const updates = [];
      const params = [];
  
      // Add non-JSON fields to the update query
      if (role) {
        updates.push("role = ?");
        params.push(role);
      }
      if (title) {
        updates.push("title = ?");
        params.push(title);
      }
      if (first_name) {
        updates.push("first_name = ?");
        params.push(first_name);
      }
      if (last_name) {
        updates.push("last_name = ?");
        params.push(last_name);
      }
      if (email) {
        updates.push("email = ?");
        params.push(email);
      }
      if (phone_number) {
        updates.push("phone_number = ?");
        params.push(phone_number);
      }
      if (country) {
        updates.push("country = ?");
        params.push(country);
      }
      if (source_of_funds) {
        updates.push("source_of_funds = ?");
        params.push(source_of_funds);
      }
      if (source_of_funds_other) {
        updates.push("source_of_funds_other = ?");
        params.push(source_of_funds_other);
      }
      if (percentage_of_shares) {
        updates.push("percentage_of_shares = ?");
        params.push(percentage_of_shares);
      }
      if (city) {
        updates.push("city = ?");
        params.push(city);
      }
      if (post_code) {
        updates.push("post_code = ?");
        params.push(post_code);
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
        `UPDATE organizationOwnershipInfo SET ${updates.join(", ")} WHERE id = ?`,
        params
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Organization Ownership info not found or no changes made.",
        });
      }
  
      res.status(200).json({
        status: 200,
        message: "Organization Ownership info updated successfully.",
      });
    } catch (err) {
      next(err);
    }
  }
};
