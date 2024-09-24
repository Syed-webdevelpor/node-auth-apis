const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const crypto = require("crypto");
const DB = require("../dbConnection.js");
const { fetchUserByEmailOrID } = require("../controllers/user.js");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://51.21.131.37/auth/google/callback', // Ensure this matches Google Console's callback URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists in DB
        const email = profile.emails[0].value;
        const user = await fetchUserByEmailOrID(email, true);
        
        if (user.length > 0) {
          // User exists, return the user data
          return done(null, user[0]);
        } else {
          // If user doesn't exist, create a new user with Google profile data
          const googleId = profile.id;
          const firstName = profile.name.givenName;
          const lastName = profile.name.familyName;
          const referralCode = crypto.randomBytes(4).toString("hex");
          
          // Insert the new user into the database
          const [result] = await DB.execute(
            "INSERT INTO `users` (`email`, `id`, `referral_code`) VALUES (?, ?, ?)",
            [email, googleId, referralCode]
          );

          const newUser = {
            id: result.insertId,
            email
          };

          return done(null, newUser);
        }
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  const user = await fetchUserByEmailOrID(id, false);
  done(null, user[0]);
});
