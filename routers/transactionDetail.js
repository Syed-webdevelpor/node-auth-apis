const express = require("express");
const { tokenValidation,validate } = require("../middlewares/authentication.js");
const transactionDetail = require("../controllers/transactionDetail.js");
const router = express.Router();

router.post("/add", tokenValidation(), validate,transactionDetail.transactionDetail);
router.get(
    "/:userId/get",
    tokenValidation(),
    validate,
    transactionDetail.getTransactionDetailByUserId
  );
router.post("/update",tokenValidation(), validate,transactionDetail.updateTransactionDetail);

module.exports = router;
