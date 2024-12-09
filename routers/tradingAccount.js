const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const tradingAccount = require("../controllers/tradingAccount.js");
const router = express.Router();

router.post("/add", tokenValidation(), validate, tradingAccount.createAccount);
router.get(
  "/:id/getById",
  tokenValidation(),
  validate,
  tradingAccount.getTradingAccountById
);
router.get(
  "/:userId/get",
  tokenValidation(),
  validate,
  tradingAccount.getTradingAccountByUserId
);
router.post(
  "/update",
  tokenValidation(),
  validate,
  tradingAccount.updateAccount
);

module.exports = router;
