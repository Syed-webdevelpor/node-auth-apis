const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const { body } = require("express-validator");
const { fetchUserByEmailOrID } = require("../controllers/user.js");
const introducerBroker = require("../controllers/introducerBroker.js");
const user = require("../controllers/user.js");
const router = express.Router();

router.post(
  "/add",
  [
    body("email", "Invalid email address.")
      .trim()
      .isEmail()
      .custom(async (email) => {
        const isExist = await fetchUserByEmailOrID(email);
        if (isExist.length)
          throw new Error("A user already exists with this e-mail address");
        return true;
      }),
    body("password")
      .trim()
      .isLength({ min: 4 })
      .withMessage("Password must be at least 4 characters long"),
  ],
  tokenValidation(),
  validate,
  introducerBroker.createIntroducingBroker,
  user.signup
);
router.get(
  "/:id/get",
  tokenValidation(),
  validate,
  introducerBroker.getIntroducingBroker
);
router.get(
  "/getAll",
  tokenValidation(),
  validate,
  introducerBroker.getAllintroducingBroker
);
router.post(
  "/update",
  tokenValidation(),
  validate,
  introducerBroker.updateIntroducingBroker
);

module.exports = router;
