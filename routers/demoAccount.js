const express = require("express");
const { tokenValidation,validate } = require("../middlewares/authentication.js");
const demoAccount = require("../controllers/demoAccount.js");
const router = express.Router();

router.post("/add", demoAccount.addDemoAccount);
router.get(
    "/:id/get",
    demoAccount.getDemoByID
  );
router.post("/update", demoAccount.updateDemoAccount);

module.exports = router;
