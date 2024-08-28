const express = require("express");
const { tokenValidation } = require("../middlewares/authentication.js");
const personalInfo = require("../controllers/personalInfo.js");
const router = express.Router();

router.post("/add", personalInfo.createPersonalInfo);
router.get(
  "/:id/get",
  tokenValidation,
  personalInfo.getPersonalInfo
);
router.post(
  "/update",
  tokenValidation,
  personalInfo.updatePersonalInfo
);

module.exports = router;
