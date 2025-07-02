const s3 = require('../middlewares/s3Client');
const axios = require('axios');
const DB = require("../dbConnection.js");
const crypto = require("crypto");
const { sendVerificationKycDocsEmail } = require('../middlewares/sesMail');

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

axios.defaults.baseURL = process.env.SUMSUB_BASE_URL;
// Function to create the signature for Sumsub API requests
function createSignature(config) {
  const ts = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', process.env.SUMSUB_SECRET_KEY)
    .update(ts + config.method.toUpperCase() + config.url)
    .digest('hex');

  config.headers['X-App-Access-Ts'] = ts;
  config.headers['X-App-Access-Sig'] = signature;

  return config;
}

// Intercept all requests to add the signature
axios.interceptors.request.use(createSignature, function (error) {
  return Promise.reject(error);
});

const fetchOrganizationalInfoByID = async (id) => {
  sql = "SELECT * FROM `organizationalInfo` WHERE `user_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

const fetchOrganizationaOwnershiplInfoByID = async (id) => {
  sql = "SELECT * FROM `organizationOwnershipInfo` WHERE `organizational_info_id`=?";
  const [row] = await DB.execute(sql, [id]);
  return row;
};

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

axios.defaults.baseURL = process.env.SUMSUB_BASE_URL;

async function createAccessToken(externalUserId, levelName, ttlInSecs = 600) {
  const url = `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&ttlInSecs=${ttlInSecs}&levelName=${encodeURIComponent(levelName)}`;

  const headers = {
    'Accept': 'application/json',
    'X-App-Token': process.env.SUMSUB_APP_TOKEN
  };

  try {
    const response = await axios.post(url, null, { headers });
    return response.data;
  } catch (error) {
    console.error('Error creating access token:', error.response ? error.response.data : error.message);
    throw error;
  }
}

async function createWebSdkLink(levelName, userId, ttlInSecs = 1800) {
  const url = '/resources/sdkIntegrations/levels/-/websdkLink';

  const body = {
    levelName,
    userId,
    ttlInSecs
  };

  let config = {
    headers: {
      'Content-Type': 'application/json',
      'X-App-Token': process.env.SUMSUB_APP_TOKEN,
    },
    url: url,
    method: 'POST',
    data: body
  };

  try {
    const response = await axios(config);
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

    const levelName = 'basic-kyc-level';
    const ttlInSecs = 600;

    const results = [];

    for (const ownershipInfo of ownershipInfos) {
      try {
        // Create access token
        const tokenData = await createAccessToken(ownershipInfo.id, levelName, ttlInSecs);

        // Create websdk link
        const linkData = await createWebSdkLink(levelName, ownershipInfo.id, 1800);

        // Send email with link to ownershipInfo email
        if (ownershipInfo.email) {
          await sendVerificationKycDocsEmail(ownershipInfo.email, linkData.link, `${ownershipInfo.first_name || ''} ${ownershipInfo.last_name || ''}`.trim());
        }

        results.push({
          ownershipInfoId: ownershipInfo.id,
          email: ownershipInfo.email,
          tokenData,
          linkData
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

