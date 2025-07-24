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
            address
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
            post_code,
            address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            address
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

updateOrganizationalOwnershipInfo: async (req, res, next) => {
  try {
    const updatesArray = req.body;

    if (!Array.isArray(updatesArray) || updatesArray.length === 0) {
      return res.status(400).json({
        status: 400,
        message: "No ownership data provided for update.",
      });
    }

    for (const item of updatesArray) {
      let {
        id,
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
        address,
      } = item;

      const columns = [];
      const placeholders = [];
      const values = [];

      if (role) columns.push("role"), placeholders.push("?"), values.push(role);
      if (title) columns.push("title"), placeholders.push("?"), values.push(title);
      if (first_name) columns.push("first_name"), placeholders.push("?"), values.push(first_name);
      if (last_name) columns.push("last_name"), placeholders.push("?"), values.push(last_name);
      if (email) columns.push("email"), placeholders.push("?"), values.push(email);
      if (phone_number) columns.push("phone_number"), placeholders.push("?"), values.push(phone_number);
      if (country) columns.push("country"), placeholders.push("?"), values.push(country);
      if (source_of_funds) columns.push("source_of_funds"), placeholders.push("?"), values.push(source_of_funds);
      if (source_of_funds_other) columns.push("source_of_funds_other"), placeholders.push("?"), values.push(source_of_funds_other);
      if (percentage_of_shares) columns.push("percentage_of_shares"), placeholders.push("?"), values.push(percentage_of_shares);
      if (city) columns.push("city"), placeholders.push("?"), values.push(city);
      if (post_code) columns.push("post_code"), placeholders.push("?"), values.push(post_code);
      if (address) columns.push("address"), placeholders.push("?"), values.push(address);

      if (columns.length === 0) continue;

      if (id) {
        // UPDATE
        const updates = columns.map(col => `${col} = ?`);
        values.push(id);
        await DB.execute(
          `UPDATE organizationOwnershipInfo SET ${updates.join(", ")} WHERE id = ?`,
          values
        );
      } else {
        // INSERT with new UUID
        id = uuidv4();
        columns.unshift("id");
        placeholders.unshift("?");
        values.unshift(id);

        await DB.execute(
          `INSERT INTO organizationOwnershipInfo (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
          values
        );
      }
    }

    res.status(200).json({
      status: 200,
      message: "Ownership info inserted/updated successfully.",
    });
  } catch (err) {
    next(err);
  }
}
};
