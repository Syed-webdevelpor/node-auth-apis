const express = require('express');
const router = express.Router();

const ssoController = require('../controllers/ssoController');
const ssoAuth = require('../middlewares/ssoAuth');
const auditLogger = require('../middlewares/auditLogger');
const rateLimitSso = require('../middlewares/rateLimitSso');
const { validate, validateTokenValidators } = ssoController;


// POST /sso/generate-token
router.post(
  '/generate-token',
  rateLimitSso,
  ssoAuth,
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

