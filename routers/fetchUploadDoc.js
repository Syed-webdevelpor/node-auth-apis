const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const fetchUploadDoc = require("../controllers/fetchUploadDoc.js");
const router = express.Router();

router.post("/", tokenValidation(), validate, fetchUploadDoc.fetchUploadDoc);


module.exports = router;