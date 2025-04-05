const express = require("express");
const {
    tokenValidation,
    validate,
} = require("../middlewares/authentication.js");
const notification = require("../controllers/notification.js");
const router = express.Router();

router.post(
    "/:id/updateNotification",
    tokenValidation(),
    validate,
    notification.updateNotification
);
router.get(
    "/:accManId/getNotification",
    tokenValidation(),
    validate,
    notification.getNotification
);

module.exports = router;
