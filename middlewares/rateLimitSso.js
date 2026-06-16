const rateLimit = require('express-rate-limit');

// Stricter limits for SSO endpoints to reduce abuse.
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests',
  },
});

module.exports = limiter;

