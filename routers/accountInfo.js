const express = require("express");
const { tokenValidation } = require("../middlewares/authentication.js");
const accountInfo = require("../controllers/accountInfo.js");
const router = express.Router();

router.post("/accountInfo", accountInfo.createAccountInfo);
router.get("/:id/getAccountInfo", tokenValidation, accountInfo.getAccountInfo);
router.post("update/accountInfo",tokenValidation, accountInfo.updateAccountInfo);

module.exports = router;
