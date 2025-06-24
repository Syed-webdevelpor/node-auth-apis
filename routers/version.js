const express = require('express');
const router = express.Router();
const versionController = require('../controllers/version');

router.get('/', versionController.getVersion);
router.put('/', versionController.updateVersion);

module.exports = router;
