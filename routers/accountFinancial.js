const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const accountFinancial = require("../controllers/accountFinancial.js");
const router = express.Router();

router.post(
  "/add",
  tokenValidation(),
  validate,
  accountFinancial.createAccountFinancial
);
router.get(
  "/:userId/get",
  tokenValidation(),
  validate,
  accountFinancial.getAccountFinancial
);

router.get(
  "/:accountId/getByAccountId",
  tokenValidation(),
  validate,
  accountFinancial.getAccountFinancialByAccountId
);

router.get(
  "/getAll",
  tokenValidation(),
  validate,
  accountFinancial.getAllAccountFinancial
);

router.post(
  "/update",
  tokenValidation(),
  validate,
  accountFinancial.updateAccountFinancial
);

module.exports = router;
