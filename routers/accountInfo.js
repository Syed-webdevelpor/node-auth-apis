const express = require("express");
const { tokenValidation } = require("../middlewares/authentication.js");
const accountInfo = require("../controllers/accountInfo.js");
const router = express.Router();

router.post("/add", accountInfo.createAccountInfo);
router.get("/:id/get", tokenValidation, accountInfo.getAccountInfo);
router.post("/update",tokenValidation, accountInfo.updateAccountInfo);

module.exports = router;
