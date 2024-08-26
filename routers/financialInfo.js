const express = require("express");
const { tokenValidation } = require("../middlewares/authentication.js");
const financialInfo = require("../controllers/financialInfo.js");
const router = express.Router();

router.post("/financialInfo", financialInfo.createFinancialInfo);
router.get("/:id/getFinancialInfo", tokenValidation, financialInfo.getFinancialInfo);
router.post("update/financialInfo",tokenValidation, financialInfo.updateFinancialInfo);

module.exports = router;
