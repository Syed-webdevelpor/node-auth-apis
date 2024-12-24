const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const orgFinancialInfo = require("../controllers/organizationalFinancialInfo.js");
const router = express.Router();

router.post(
  "/add",
  tokenValidation(),
  validate,
  orgFinancialInfo.createOrgFinancialInfo
);
router.get(
  "/:id/get",
  tokenValidation(),
  validate,
  orgFinancialInfo.getOrgFinancialInfo
);
router.post(
  "/update",
  tokenValidation(),
  validate,
  orgFinancialInfo.updateOrgFinancialInfo
);

module.exports = router;
