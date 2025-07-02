// controllers/uploadController.js
const s3 = require('../middlewares/s3Client');
const path = require('path');

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// controllers/orgInfoDoc.js (add better error handling)
exports.uploadFiles = async (req, res) => {
  try {
    const { userId } = req.body;
    const files = req.files;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' });
    }

    // Validate file sizes (redundant safety check)
    const oversizedFiles = files.filter(f => f.size > 50 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      return res.status(413).json({ 
        error: `These files exceed 50MB limit: ${oversizedFiles.map(f => f.originalname).join(', ')}`
      });
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

    const results = await Promise.all(uploadPromises);
    
    res.status(200).json({
      message: `${files.length} file(s) uploaded successfully`,
      files: results.map((file) => ({
        name: file.Key.split('_').pop(),
        key: file.Key,
        url: file.Location,
        size: file.Size
      })),
    });

  } catch (err) {
    console.error('Upload Error:', err);
    
    // Handle AWS errors specifically
    if (err.name === 'RequestEntityTooLargeError') {
      return res.status(413).json({ error: 'Total upload size exceeds server limit' });
    }
    
    res.status(500).json({ 
      error: 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

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

