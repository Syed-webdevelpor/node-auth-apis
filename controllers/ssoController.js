const { body, validationResult } = require('express-validator');
const ssoService = require('../services/ssoService');
const auditLogger = require('../middlewares/auditLogger');
const DB = require('../dbConnection.js');

const validate = (req, res, next) => {
  const errors = validationResult(req).mapped();
  if (Object.keys(errors).length) {
    return res.status(422).json({ success: false, errors });
  }
  next();
};


const validateTokenValidators = [
  body('token').isString().trim().notEmpty().withMessage('token is required'),
];

async function generateToken(req, res) {
  const { id, email } = req.crmUser || {};

  if (!id || !email) {
    auditLogger({
      action: 'sso.generate-token',
      outcome: 'fail',
      userId: id,
      email,
      ip: req.ip,
      route: req.originalUrl,
      status: 401,
      details: { reason: 'missing_crm_user' },
    });
    return res.status(401).json({ success: false, message: 'Invalid CRM user' });
  }

  const token = await ssoService.generateSingleUseToken({ userId: id, email });

  auditLogger({
    action: 'sso.generate-token',
    outcome: 'success',
    userId: id,
    email,
    ip: req.ip,
    route: req.originalUrl,
    status: 201,
    details: { ttlSeconds: ssoService.TTL_SECONDS },
  });

  return res.status(201).json({ success: true, token });
}

async function validateToken(req, res) {
  const token = req.body?.token;
  const ip = req.ip;
  const route = req.originalUrl;

  // Helpful debug: we only log a small prefix, never the whole token.
  const tokenPrefix = typeof token === 'string' ? token.slice(0, 8) : null;

  const consumed = await ssoService.consumeSingleUseToken(token);

  if (!consumed || !consumed.userId || !consumed.email) {
    auditLogger({
      action: 'sso.validate-token',
      outcome: 'fail',
      userId: null,
      email: null,
      ip,
      route,
      status: 401,
      details: {
        reason: 'invalid_or_expired_or_used',
        tokenPrefix,
      },
    });
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }


  // Token already consumed (atomic getDel) and deleted.
  const user = {
    id: consumed.userId,
    email: consumed.email,
  };

  auditLogger({
    action: 'sso.validate-token',
    outcome: 'success',
    userId: user.id,
    email: user.email,
    ip,
    route,
    status: 200,
    details: { consumedAt: new Date().toISOString() },
  });

  return res.status(200).json({ success: true, user });
}

module.exports = {
  generateToken,
  validateToken,
  validateTokenValidators,
  validate,
};

