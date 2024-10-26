const express = require("express");
const { tokenValidation,validate } = require("../middlewares/authentication.js");
const wallet = require("../controllers/wallet.js");
const router = express.Router();

router.post("/add",tokenValidation(),validate, wallet.wallet);
router.get(
    "/:userId/get",
    tokenValidation(),
    validate,
    wallet.getWalletByID
  );
router.post("/update",tokenValidation(),validate, wallet.updateWallet);

module.exports = router;
