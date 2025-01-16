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
router.get("/profile", tokenValidation(), validate, user.getUser);
router.get("/getAll", tokenValidation(), validate, user.getAllUsers);
router.get("/:userId/getProfile", tokenValidation(), validate, user.getProfile);
router.post("/:id/update", tokenValidation(), validate, user.updateUser);
router.get("/refresh", tokenValidation(true), validate, user.refreshToken);
router.post("/logout", tokenValidation(true), validate, user.logout);
router.get("/verify", user.verifyEmail);
router.post("/resend_email",tokenValidation(), validate, user.resendVerificationLink);
router.post("/forget_password", user.forgetPassword);
router.post("/reset_password", user.resetPassword);
router.post("/kyc_access_token", user.kycAccessToken);

module.exports = router;
