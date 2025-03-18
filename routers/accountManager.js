const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const accountManager = require("../controllers/accountManager.js");
const router = express.Router();

router.post(
  "/add",
  tokenValidation(),
  validate,
  accountManager.createAccountManager
);

router.get(
  "/:id/getById",
  tokenValidation(),
  validate,
  accountManager.getAccountManagerById
);

router.get(
    "/getAll",
    tokenValidation(),
    validate,
    accountManager.getAllAccountManagers
);

router.put(
  "/:id/update",
  tokenValidation(),
  validate,
  accountManager.updateAccountManager
);

router.delete(
  "/:id/delete",
  tokenValidation(),
  validate,
  accountManager.deleteAccountManager
);

module.exports = router;
