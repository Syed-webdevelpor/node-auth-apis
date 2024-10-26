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
  "/:id/get",
  tokenValidation(),
  validate,
  accountFinancial.getAccountFinancial
);
router.post(
  "/update",
  tokenValidation(),
  validate,
  accountFinancial.updateAccountFinancial
);

module.exports = router;
