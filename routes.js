const express = require("express");
const { body, header } = require("express-validator");
const controller = require("./controller.js");
const { validate, fetchUserByEmailOrID } = require("./controller.js");

const router = express.Router();

// Token Validation Rule
const tokenValidation = (isRefresh = false) => {
  let refreshText = isRefresh ? "Refresh" : "Authorization";

  return [
    header("Authorization", `Please provide your ${refreshText} token`)
      .exists()
      .not()
      .isEmpty()
      .custom((value, { req }) => {
        if (!value.startsWith("Bearer") || !value.split(" ")[1]) {
          throw new Error(`Invalid ${refreshText} token`);
        }
        if (isRefresh) {
          req.headers.refresh_token = value.split(" ")[1];
          return true;
        }
        req.headers.access_token = value.split(" ")[1];
        return true;
      }),
  ];
};

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
  controller.signup
);

// Login user through email and password
router.post(
  "/login",
  [
    body("email", "Invalid email address.")
      .trim()
      .isEmail()
      .custom(async (email, { req }) => {
        const isExist = await fetchUserByEmailOrID(email);
        if (isExist.length === 0)
          throw new Error("Your email is not registered.");
        req.body.user = isExist[0];
        return true;
      }),
    body("password", "Incorrect Password").trim().isLength({ min: 4 }),
  ],
  validate,
  controller.login
);

// Get the user data by providing the access token
router.get("/profile", tokenValidation(), validate, controller.getUser);
router.post("/personalInfo", controller.createPersonalInfo);
router.post("/financialInfo", controller.createFinancialInfo);
router.post("/accountInfo", controller.createAccountInfo);
router.post("/account", controller.createAccount);
router.post("/transactionDetails", controller.transactionDetail);
router.post("/referFriends", controller.createReferFriend);
router.get("/:userId/getProfile", tokenValidation(), controller.getProfile);
router.get("/:id/getPersonalInfo", tokenValidation(), controller.getPersonalInfo);
router.get("/:id/getFinancialInfo", tokenValidation(), controller.getFinancialInfo);
router.get("/:id/getAccountInfo", tokenValidation(), controller.getAccountInfo);
router.get("/:id/getReferFriend", tokenValidation(), controller.getReferFriend);
router.post("update/personalInfo",tokenValidation(), controller.updatePersonalInfo);
router.post("update/financialInfo",tokenValidation(), controller.updateFinancialInfo);
router.post("update/accountInfo",tokenValidation(), controller.updateAccountInfo);
router.post("update/account",tokenValidation(), controller.updateAccount);
router.post("update/transactionDetails",tokenValidation(), controller.updateTransactionDetail);
// Get new access and refresh token by providing the refresh token
router.get(
  "/refresh",
  tokenValidation(true),
  validate,
  controller.refreshToken
);

module.exports = router;
