const express = require("express");
const { tokenValidation } = require("../middlewares/authentication.js");
const referFriend = require("../controllers/referFriend.js");
const router = express.Router();

router.post("/referFriends", referFriend.createReferFriend);
router.get("/:id/getReferFriend", tokenValidation, referFriend.getReferFriend);

module.exports = router;
