const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const financialInfo = require("../controllers/financialInfo.js");
const router = express.Router();

router.post(
  "/add",
  tokenValidation(),
  validate,
  financialInfo.createFinancialInfo
);
router.get(
  "/:id/get",
  tokenValidation(),
  validate,
  financialInfo.getFinancialInfo
);
router.post(
  "/update",
  tokenValidation(),
  validate,
  financialInfo.updateFinancialInfo
);

module.exports = router;
