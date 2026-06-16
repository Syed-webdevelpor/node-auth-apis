const { body, validationResult } = require('express-validator');
const { verifyToken } = require('../tokenHandler.js');
const DB = require('../dbConnection.js');

// Validate CRM authenticated user.
// Current CRM auth uses access_token in header "access_token" (see controllers/user.js).
// This middleware extracts token, verifies JWT, fetches user, and attaches req.crmUser.

module.exports = async function ssoAuth(req, res, next) {
  try {
    const accessToken = req.headers.access_token || req.headers.authorization?.split(' ')[1];

    if (!accessToken) {
      return res.status(401).json({ success: false, message: 'Missing CRM access token' });
    }

    const decoded = verifyToken(accessToken, true);
    if (!decoded || decoded.status) {
      return res.status(401).json({ success: false, message: 'Invalid CRM access token' });
    }

    const userId = decoded.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid CRM token payload' });
    }

    const [rows] = await DB.execute('SELECT id, email, is_verified FROM users WHERE id = ?', [userId]);
    if (!rows || rows.length !== 1) {
      return res.status(404).json({ success: false, message: 'CRM user not found' });
    }

    const user = rows[0];
    // Optionally enforce verified users. Requirement only says validate authenticated CRM user.
    // Keep permissive.
    req.crmUser = {
      id: user.id,
      email: user.email,
      isVerified: user.is_verified,
    };

    return next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'SSO auth failure', error: err.message });
  }
};

