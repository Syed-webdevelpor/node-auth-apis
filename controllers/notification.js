const DB = require("../dbConnection.js");
const { v4: uuidv4 } = require("uuid");
const { verifyToken } = require("../tokenHandler.js");

const fetchNotificationByAccManID = async (id) => {
    sql = "SELECT * FROM `notifications` WHERE `user_id`=?";
    const [row] = await DB.execute(sql, [id]);
    return row;
};

module.exports = {
    getNotification: async (req, res, next) => {
        try {
            const data = verifyToken(req.headers.access_token);
            if (data && data.status) return res.status(data.status).json(data);
            const notifications = await fetchNotificationByAccManID(req.params.accManId);
            if (notifications.length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: "notification not found",
                });
            }
            res.json({
                status: 200,
                notification: notifications,
            });
        } catch (err) {
            next(err);
        }
    },
    updateNotification: async (req, res, next) => {
        try {
            const data = verifyToken(req.headers.access_token);
            if (data && data.status) return res.status(data.status).json(data);
            const {
                id,
                user_id,
                message,
                is_read,
            } = req.body;

            const [result] = await DB.execute(
                "UPDATE `notifications` SET `user_id` = ?, `message` = ?, `is_read` = ? WHERE `id` = ?",
                [
                    user_id,
                    message,
                    is_read,
                    id
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    status: 404,
                    message: "Notification not found",
                });
            }

            res.status(200).json({
                status: 200,
                message: "Notification updated successfully",
            });
        } catch (err) {
            next(err);
        }
    },
};
