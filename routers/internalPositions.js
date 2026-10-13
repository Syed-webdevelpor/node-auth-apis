const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const internalPositions = require("../controllers/internalPositionsController.js");

const router = express.Router();

// Portal-authenticated route that proxies to the Trading Server internal
// endpoint GET /internal/positions/account/:accountId.
router.get(
  "/account/:accountId",
  tokenValidation(),
  validate,
  internalPositions.getOpenPositionsByAccount
);

module.exports = router;
