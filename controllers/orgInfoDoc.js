const axios = require('axios');
const sumsubAxios = axios.create({
  baseURL: 'https://api.sumsub.com'
});
const DB = require("../dbConnection.js");
const crypto = require('crypto');
const { sendVerificationKycDocsEmail } = require('../middlewares/sesMail');
const s3 = require('../middlewares/s3Client');

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const fetchOrganizationalInfoByID = async (id) => {
  const sql = "SELECT * FROM `organizationalInfo` WHERE `user_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

const fetchOrganizationaOwnershiplInfoByID = async (id) => {
  const sql = "SELECT * FROM `organizationOwnershipInfo` WHERE `organizational_info_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL;
var config = {};
config.baseURL= SUMSUB_BASE_URL;

sumsubAxios.interceptors.request.use(createSignature, function (error) {
  return Promise.reject(error);
})
function createSignature(config) {

  var ts = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256',  SUMSUB_SECRET_KEY);
  signature.update(ts + config.method.toUpperCase() + config.url);

  if (config.data instanceof FormData) {
    signature.update(config.data.getBuffer());
  } else if (config.data) {
    signature.update(config.data);
  }

  config.headers['X-App-Access-Ts'] = ts;
  config.headers['X-App-Access-Sig'] = signature.digest('hex');

  return config;
}

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

async function createWebSdkLink(levelName, userId, ttlInSecs = 1800) {
  const data = {
      ttlInSecs,
      levelName,
      userId
    }
  const options = {
    method: 'POST',
    url: '/resources/sdkIntegrations/levels/-/websdkLink',
    headers : {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-App-Token': SUMSUB_APP_TOKEN
    },
    data: JSON.stringify(data)
  };

  try {
    const response = await sumsubAxios.request(options);
    return response.data;
  } catch (error) {
    console.error('Error creating websdk link:', error.response ? error.response.data : error.message);
    throw error;
  }
}

exports.createAccessTokensAndSendLinks = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required in request body' });
    }

    // Fetch organizationalInfo by userId
    const organizationalInfo = await fetchOrganizationalInfoByID(userId);
    if (!organizationalInfo || organizationalInfo.length === 0) {
      return res.status(404).json({ error: 'Organizational info not found for userId' });
    }
    const organizationalInfoId = organizationalInfo[0].id;

    // Fetch organizationOwnershipInfo by organizational_info_id
    const ownershipInfos = await fetchOrganizationaOwnershiplInfoByID(organizationalInfoId);
    if (!ownershipInfos || ownershipInfos.length === 0) {
      return res.status(404).json({ error: 'Organization ownership info not found for organizationalInfoId' });
    }

    const levelName = 'Live account verification';

    const results = [];

    for (const ownershipInfo of ownershipInfos) {
      try {
        // Create websdk link
        const linkData = await createWebSdkLink(levelName, ownershipInfo.id, 600);

        // Send email with link to ownershipInfo email
        if (ownershipInfo.email) {
          await sendVerificationKycDocsEmail(ownershipInfo.email, linkData.url, `${ownershipInfo.first_name || ''} ${ownershipInfo.last_name || ''}`.trim());
        }

        results.push({
          ownershipInfoId: ownershipInfo.id,
          email: ownershipInfo.email,
        });
      } catch (error) {
        console.error(`Error processing ownershipInfo id ${ownershipInfo.id}:`, error);
        results.push({
          ownershipInfoId: ownershipInfo.id,
          error: error.message || 'Error occurred'
        });
      }
    }

    res.status(200).json({
      message: 'Access tokens created and links sent successfully',
      results
    });
  } catch (error) {
    next(error);
  }
};
