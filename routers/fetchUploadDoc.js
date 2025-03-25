const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const fetchUploadDoc = require("../controllers/fetchUploadDoc.js");
const router = express.Router();

router.post("/", tokenValidation(), validate, fetchUploadDoc.fetchUploadDoc);
router.get("/:userId/get", tokenValidation(), validate, fetchUploadDoc.handleGetUserFiles)


module.exports = router;