const express = require('express');
const internalApiAuth = require('../middlewares/internalApiAuth.js');
const { handlePasswordChanged } = require('../controllers/internalUserController.js');

const router = express.Router();

// Internal service-to-service endpoint - protected by internal API secret
router.post('/users/password-changed', internalApiAuth, handlePasswordChanged);

module.exports = router;