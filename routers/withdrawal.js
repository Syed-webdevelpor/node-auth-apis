const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const withdrawal = require("../controllers/withDrawal.js");
const router = express.Router();

router.post("/", tokenValidation(), validate, withdrawal.withdrawalEmail);


module.exports = router;