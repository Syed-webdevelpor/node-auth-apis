const express = require("express");
const { tokenValidation } = require("../middlewares/authentication.js");
const account = require("../controllers/account.js");
const router = express.Router();

router.post("/account", account.createAccount);
router.post("update/account",tokenValidation, account.updateAccount);

module.exports = router;
