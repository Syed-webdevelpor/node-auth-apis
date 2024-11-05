const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const demoAccountFinancial = require("../controllers/demoAccountFinancial.js");
const router = express.Router();

router.post(
  "/add",
  tokenValidation(),
  validate,
  demoAccountFinancial.createDemoAccountFinancial
);
router.get(
  "/:userId/get",
  tokenValidation(),
  validate,
  demoAccountFinancial.getDemoAccountFinancial
);
router.post(
  "/update",
  tokenValidation(),
  validate,
  demoAccountFinancial.updateDemoAccountFinancial
);

module.exports = router;
