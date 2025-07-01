// controllers/uploadController.js
const s3 = require('../middlewares/s3Client');
const path = require('path');

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// Upload multiple files
exports.uploadFiles = async (req, res) => {
  const { userId } = req.body;
  const files = req.files;

  if (!userId || !files || files.length === 0) {
    return res.status(400).json({ error: 'userId and files are required' });
  }

  const uploadPromises = files.map((file) => {
    const key = `OrganizationalInfo/${userId}/${Date.now()}_${file.originalname}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    return s3.upload(params).promise();
  });

  try {
    const results = await Promise.all(uploadPromises);
    res.status(200).json({
      message: 'Files uploaded successfully',
      files: results.map((file) => ({
        key: file.Key,
        url: file.Location,
      })),
    });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
};

// Get user documents
exports.getUserDocuments = async (req, res) => {
  const { userId } = req.params;
  const prefix = `OrganizationalInfo/${userId}/`;

  const params = {
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  };

  try {
    const data = await s3.listObjectsV2(params).promise();

    const files = await Promise.all(
      (data.Contents || []).map(async (item) => {
        const signedUrl = s3.getSignedUrl('getObject', {
          Bucket: BUCKET_NAME,
          Key: item.Key,
          Expires: 60 * 60, // 1 hour
        });

        return {
          key: item.Key,
          signedUrl,
        };
      })
    );

    res.json({ files });
  } catch (err) {
    console.error('List Error:', err);
    res.status(500).json({ error: 'Failed to list user documents' });
  }
};

