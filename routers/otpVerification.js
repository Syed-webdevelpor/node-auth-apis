const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpVerification');
const appAttestController = require('../controllers/appAttest');

router.post('/request-otp', otpController.requestOtp);
router.post('/verify-otp', otpController.verifyOtp);

// Platform attestation support endpoints.
router.post('/integrity-challenge', appAttestController.integrityChallenge);
router.post('/appattest-challenge', appAttestController.appAttestChallenge);
router.post('/appattest-register', appAttestController.register);

module.exports = router;
