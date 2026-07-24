const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const crypto = require("crypto");
const DB = require("../dbConnection.js");
const { fetchUserByEmailOrID } = require("../controllers/user.js");

/**
 * Log login activity into the login_activity table
 */
const logLoginActivity = async ({ user_id, ip_address, user_agent, device_info, login_type, status, failure_reason }) => {
  try {
    const id = crypto.randomUUID();
    const login_time = new Date();
    await DB.execute(
      `INSERT INTO login_activity (id, user_id, ip_address, user_agent, device_info, login_type, status, failure_reason, login_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id, ip_address, user_agent, device_info || null, login_type, status, failure_reason || null, login_time]
    );
  } catch (err) {
    console.error("Failed to log login activity:", err.message);
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://51.21.131.37/auth/google/callback', // Ensure this matches Google Console's callback URL
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists in DB
        const email = profile.emails[0].value;
        const user = await fetchUserByEmailOrID(email, true);
        
        if (user.length > 0) {
          // Log successful Google OAuth login
          await logLoginActivity({
            user_id: user[0].id,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || null,
            device_info: JSON.stringify({ provider: 'google', googleId: profile.id }),
            login_type: 'google_oauth',
            status: 'success'
          });
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
            id: googleId,
            email
          };

          // Log successful Google OAuth signup + login
          await logLoginActivity({
            user_id: googleId,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || null,
            device_info: JSON.stringify({ provider: 'google', googleId: profile.id }),
            login_type: 'google_oauth',
            status: 'success'
          });

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
