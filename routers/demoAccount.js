const express = require("express");
const { tokenValidation,validate } = require("../middlewares/authentication.js");
const demoAccount = require("../controllers/demoAccount.js");
const router = express.Router();

router.post("/add",tokenValidation(),validate, demoAccount.addDemoAccount);
router.get(
    "/:userId/get",
    tokenValidation(),
    validate,
    demoAccount.getDemoByID
  );
router.post("/update",tokenValidation(),validate, demoAccount.updateDemoAccount);

module.exports = router;
