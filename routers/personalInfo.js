const express = require("express");
const { tokenValidation, validate } = require("../middlewares/authentication.js");
const personalInfo = require("../controllers/personalInfo.js");
const router = express.Router();

router.post(
  "/add",
  tokenValidation(),
  validate,
  personalInfo.createPersonalInfo
);
router.get(
  "/:id/get",
  tokenValidation(),
  validate,
  personalInfo.getPersonalInfo
);
router.post(
  "/update",
  tokenValidation(),
  validate,
  personalInfo.updatePersonalInfo
);

module.exports = router;
