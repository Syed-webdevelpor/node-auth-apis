const express = require("express");
const { tokenValidation, validate } = require("../middlewares/authentication.js");
const organizationalInfo = require("../controllers/organizationalInfo.js");
const router = express.Router();

router.post(
  "/add",
  tokenValidation(),
  validate,
  organizationalInfo.createOrganizationalInfo
);
router.get(
  "/:id/get",
  tokenValidation(),
  validate,
  organizationalInfo.getOrganizationalInfo
);
router.post(
  "/update",
  tokenValidation(),
  validate,
  organizationalInfo.updateOrganizationalInfo
);

module.exports = router;
