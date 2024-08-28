const express = require("express");
const { tokenValidation } = require("../middlewares/authentication.js");
const accountFinancial = require("../controllers/accountFinancial.js");
const router = express.Router();

router.post("/add", accountFinancial.createAccountFinancial);
router.get("/:id/get", tokenValidation, accountFinancial.getAccountFinancial);
router.post("/update",tokenValidation, accountFinancial.updateAccountFinancial);

module.exports = router;
