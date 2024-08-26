const express = require("express");
const { tokenValidation } = require("../middlewares/authentication.js");
const transactionDetail = require("../controllers/transactionDetail.js");
const router = express.Router();

router.post("/transactionDetails", transactionDetail.transactionDetail);
router.post("update/transactionDetails",tokenValidation, transactionDetail.updateTransactionDetail);

module.exports = router;
