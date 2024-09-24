const passport = require("passport");
const express = require("express");
const router = express.Router();
const { generateToken } = require("../tokenHandler.js");
require('../controllers/auth');
// Google OAuth login route
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google OAuth callback route
router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect or send token
    const access_token = generateToken({ id: req.user.id });
    res.json({
      status: 200,
      message: "Logged in via Google",
      access_token,
    });
  }
);

// Add logout route to destroy the session
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.status(200).json({
      status: 200,
      message: "Logged out successfully",
    });
  });
});

module.exports = router;
