const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const accountInfo = require("../controllers/accountInfo.js");
const router = express.Router();

router.post("/add", tokenValidation(), validate, accountInfo.createAccountInfo);
router.get("/:id/get", tokenValidation(), validate, accountInfo.getAccountInfo);
router.post(
  "/update",
  tokenValidation(),
  validate,
  accountInfo.updateAccountInfo
);

module.exports = router;
