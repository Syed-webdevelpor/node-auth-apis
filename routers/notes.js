const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const notes = require("../controllers/notes.js");
const router = express.Router();

router.post(
  "/",
  tokenValidation(),
  validate,
  notes.createNotes
);
router.get(
  "/:user_id",
  tokenValidation(),
  validate,
  notes.getNotes
);

module.exports = router;
