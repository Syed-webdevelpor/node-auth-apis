const express = require("express");
const { tokenValidation } = require("../middlewares/authentication.js");
const transactionDetail = require("../controllers/transactionDetail.js");
const router = express.Router();

router.post("/add", transactionDetail.transactionDetail);
router.get(
    "/:userId/get",
    tokenValidation(),
    transactionDetail.getTransactionDetailByUserId
  );
router.post("/update",tokenValidation(), transactionDetail.updateTransactionDetail);

module.exports = router;
