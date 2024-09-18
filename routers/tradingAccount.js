const express = require("express");
const { tokenValidation } = require("../middlewares/authentication.js");
const tradingAccount = require("../controllers/tradingAccount.js");
const router = express.Router();

router.post("/add", tradingAccount.createAccount);
router.get(
    "/:id/get",
    tokenValidation(),
    tradingAccount.getTradingAccountById
  );
router.post("/update",tokenValidation(), tradingAccount.updateAccount);

module.exports = router;
