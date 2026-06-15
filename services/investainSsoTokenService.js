const jwt = require('jsonwebtoken');
require('dotenv').config();

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing env var: JWT_SECRET');
  }
  return process.env.JWT_SECRET;
}

function getExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '7d';
}

function createSsoJwt({ email, crmUserId }) {
  if (!email) throw new Error('createSsoJwt: email is required');
  if (!crmUserId) throw new Error('createSsoJwt: crmUserId is required');

  const payload = {
    email,
    crmUserId,
    type: 'investain-sso',
  };

  return jwt.sign(payload, getSecret(), { expiresIn: getExpiresIn() });
}

function verifySsoJwt(token) {
  if (!token) {
    return { status: 401, message: 'Missing auth_token cookie' };
  }

  try {
    const decoded = jwt.verify(token, getSecret());

    if (!decoded || decoded.type !== 'investain-sso') {
      return { status: 401, message: 'Invalid SSO token type' };
    }

    if (!decoded.email) {
      return { status: 401, message: 'Invalid SSO token payload' };
    }

    return decoded;
  } catch (err) {
    return { status: 401, message: `Unauthorized: ${err.message}` };
  }
}

module.exports = {
  createSsoJwt,
  verifySsoJwt,
};

