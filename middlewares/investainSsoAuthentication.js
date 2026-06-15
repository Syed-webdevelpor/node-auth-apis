const { verifySsoJwt } = require('../services/investainSsoTokenService');
const { COOKIE_NAME } = require('../utils/investainSsoCookie');

function investainSsoAuthentication(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    const decoded = verifySsoJwt(token);
    if (decoded && decoded.status) {
      return res.status(decoded.status).json({ status: decoded.status, message: decoded.message });
    }

    req.auth = {
      email: decoded.email,
      crmUserId: decoded.crmUserId,
      type: decoded.type,
    };

    return next();
  } catch (err) {
    console.error('SSO auth middleware error:', err.message);
    return res.status(500).json({ status: 500, message: 'Internal Server Error' });
  }
}

module.exports = { investainSsoAuthentication };

