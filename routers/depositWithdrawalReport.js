const express = require('express');
const { tokenValidation, validate } = require('../middlewares/authentication.js');
const {
  exportPdf,
  exportExcel,
} = require('../controllers/depositWithdrawalReportController.js');

const router = express.Router();

// Export Deposit and Withdrawal report
router.get(
  '/deposit-withdrawal/export/pdf',
  tokenValidation(),
  validate,
  exportPdf
);

router.get(
  '/deposit-withdrawal/export/excel',
  tokenValidation(),
  validate,
  exportExcel
);

module.exports = router;


