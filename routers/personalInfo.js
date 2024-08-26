const express = require("express");
const { tokenValidation } = require("../middlewares/authentication.js");
const personalInfo = require("../controllers/personalInfo.js");
const router = express.Router();

router.post("/personalInfo", personalInfo.createPersonalInfo);
router.get(
  "/:id/getPersonalInfo",
  tokenValidation,
  personalInfo.getPersonalInfo
);
router.post(
  "update/personalInfo",
  tokenValidation,
  personalInfo.updatePersonalInfo
);

module.exports = router;
