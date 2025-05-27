const express = require("express");
const {
  tokenValidation,
  validate,
} = require("../middlewares/authentication.js");
const fetchUploadDoc = require("../controllers/fetchUploadDoc.js");
const multer = require('multer');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", tokenValidation(), validate, fetchUploadDoc.fetchUploadDoc);
router.get("/:userId/get", tokenValidation(), validate, fetchUploadDoc.handleGetUserFiles);
router.post("/user_doc_req", tokenValidation(), validate, fetchUploadDoc.sendMultipleDocReq);
router.post('/doc_req/:id/sign', upload.array('files'), tokenValidation(), validate, fetchUploadDoc.signDocReq);
router.get("/get_doc_req/:userId", tokenValidation(), validate, fetchUploadDoc.getDocReqByUserId);
router.patch('/update_doc_req/:id', tokenValidation(), validate, fetchUploadDoc.updateDocReq);

router.post('/upload', upload.single('file'), tokenValidation(), validate, fetchUploadDoc.uploadFileController);

module.exports = router;