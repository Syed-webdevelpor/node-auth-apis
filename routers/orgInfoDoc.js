// routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const orgInfoDoc = require('../controllers/orgInfoDoc');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.array('files'), orgInfoDoc.uploadFiles);
router.get('/get/:userId', orgInfoDoc.getUserDocuments);

module.exports = router;
