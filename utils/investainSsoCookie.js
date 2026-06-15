require('dotenv').config();

const COOKIE_NAME = 'auth_token';
const COOKIE_DOMAIN = '.investain.com';
const COOKIE_PATH = '/';

function getCookieOptions() {
  return {
    domain: COOKIE_DOMAIN,
    path: COOKIE_PATH,
    httpOnly: true,
    secure: true,
    // Required for cross-site cookie persistence when using fetch/credentials across subdomains
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}



function setAuthTokenCookie(res, jwt) {
  res.cookie(COOKIE_NAME, jwt, getCookieOptions());
}

function clearAuthTokenCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    domain: COOKIE_DOMAIN,
    path: COOKIE_PATH,
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
}

module.exports = {
  COOKIE_NAME,
  setAuthTokenCookie,
  clearAuthTokenCookie,
};

