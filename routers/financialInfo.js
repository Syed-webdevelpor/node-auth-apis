const express = require("express");
const { tokenValidation } = require("../middlewares/authentication.js");
const financialInfo = require("../controllers/financialInfo.js");
const router = express.Router();

router.post("/add", financialInfo.createFinancialInfo);
router.get("/:id/get", tokenValidation(), financialInfo.getFinancialInfo);
router.post("/update",tokenValidation(), financialInfo.updateFinancialInfo);

module.exports = router;
