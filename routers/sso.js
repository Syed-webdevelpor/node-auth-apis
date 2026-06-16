const express = require('express');
const router = express.Router();

const ssoController = require('../controllers/ssoController');
const ssoAuth = require('../middlewares/ssoAuth');
const requireHttps = require('../middlewares/requireHttps');
const auditLogger = require('../middlewares/auditLogger');
const rateLimitSso = require('../middlewares/rateLimitSso');
const { validate, generateTokenValidators, validateTokenValidators } = ssoController;

// Ensure HTTPS only
router.use(requireHttps);

// POST /sso/generate-token
router.post(
  '/generate-token',
  rateLimitSso,
  ssoAuth,
  generateTokenValidators,
  validate,
  ssoController.generateToken
);

// POST /sso/validate-token
router.post(
  '/validate-token',
  rateLimitSso,
  validateTokenValidators,
  validate,
  ssoController.validateToken
);

module.exports = router;

