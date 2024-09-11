const express = require("express");
const { body } = require("express-validator");
const { fetchUserByEmailOrID } = require("../controllers/user.js");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const user = require("../controllers/user.js");
const router = express.Router();

// Register a new User
router.post(
  "/signup",
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
  validate,
  user.signup
);

// Login user through email and password
router.post(
  "/login",
  [
    body("email", "Invalid email address.")
      .trim()
      .isEmail()
      .custom(async (email, { req }) => {
        const isExist = await fetchUserByEmailOrID(email,true);
        if (isExist.length === 0)
          throw new Error("Your email is not registered.");
        req.body.user = isExist[0];
        return true;
      }),
    body("password", "Incorrect Password").trim().isLength({ min: 4 }),
  ],
  validate,
  user.login
);

// Get the user data by providing the access token
router.get("/profile", tokenValidation, validate, user.getUser);
router.get("/:userId/getProfile", tokenValidation, user.getProfile);
router.get("/refresh", tokenValidation(true), validate, user.refreshToken);

module.exports = router;
