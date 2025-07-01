const express = require("express");
const { tokenValidation, validate } = require("../middlewares/authentication.js");
const organizationalOwnershipInfo = require("../controllers/organizationalOwnershipInfo.js");
const router = express.Router();

router.post(
  "/add",
  tokenValidation(),
  validate,
  organizationalOwnershipInfo.createOrganizationalOwnershipInfo
);
router.get(
  "/:id/get",
  tokenValidation(),
  validate,
  organizationalOwnershipInfo.getOrganizationalOwnershipInfo
);
router.post(
  "/update",
  tokenValidation(),
  validate,
  organizationalOwnershipInfo.updateOrganizationalOwnershipInfo
);

module.exports = router;
