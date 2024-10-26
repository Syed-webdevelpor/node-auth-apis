const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const referFriend = require("../controllers/referFriend.js");
const router = express.Router();

router.post(
  "/referFriends",
  tokenValidation(),
  validate,
  referFriend.createReferFriend
);
router.get(
  "/:id/getReferFriend",
  tokenValidation(),
  validate,
  referFriend.getReferFriend
);

module.exports = router;
