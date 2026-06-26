const express = require('express');
const { tokenValidation, validate } = require('../middlewares/authentication.js');
const { proxyGetReport } = require('../controllers/reportsProxyController.js');

const router = express.Router();

router.get(
  '/trader/account-summary/export',
  tokenValidation(),
  validate,
  (req, res, next) => {
    req.params.reportKind = 'account-summary-export';
    next();
  },
  proxyGetReport
);


// Open positions
router.get(
  '/trader/open-positions/export',
  tokenValidation(),
  validate,
  (req, res, next) => {
    req.params.reportKind = 'open-positions-export';
    next();
  },
  proxyGetReport
);


// Statement
router.get(
  '/trader/statement/export',
  tokenValidation(),
  validate,
  (req, res, next) => {
    req.params.reportKind = 'statement-export';
    next();
  },
  proxyGetReport
);

module.exports = router;

