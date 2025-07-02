const express = require('express');
const multer = require('multer');
const orgInfoDoc = require('../controllers/orgInfoDoc');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
});

router.post('/upload', upload.array('files'), orgInfoDoc.uploadFiles);
router.get('/get/:userId', orgInfoDoc.getUserDocuments);
router.post('/createAccessTokensAndSendLinks', orgInfoDoc.createAccessTokensAndSendLinks);

module.exports = router;
