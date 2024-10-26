const express = require("express");
const { tokenValidation,validate } = require("../middlewares/authentication.js");
const recentActivity = require("../controllers/recentActivity.js");
const router = express.Router();

router.post("/add",tokenValidation(),validate, recentActivity.recentActivity);
router.get(
    "/:userId/get",
    tokenValidation(),
    validate,
    recentActivity.getRecentActivityByUserID
  );
router.post("/update",tokenValidation(),validate, recentActivity.updateRecentActivity);

module.exports = router;
