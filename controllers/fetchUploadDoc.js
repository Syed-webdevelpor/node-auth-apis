const axios = require('axios');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const DB = require("../dbConnection.js");

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  version:'latest'
});

// Environment variables
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL;

// Axios interceptor to create and add the signature to the request
axios.interceptors.request.use(createSignature, function (error) {
  return Promise.reject(error);
});

// Function to create the signature
function createSignature(config) {
  // Generate timestamp in seconds
  const ts = Math.floor(Date.now() / 1000);

  // Create the signature string
  const signatureString = ts + config.method.toUpperCase() + config.url;

  // Calculate the HMAC-SHA256 signature
  const signature = crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(signatureString)
    .digest('hex');

  // Add the required headers to the request
  config.headers['X-App-Token'] = SUMSUB_APP_TOKEN;
  config.headers['X-App-Access-Ts'] = ts;
  config.headers['X-App-Access-Sig'] = signature;

  return config;
}

// Function to get applicant by external ID
async function getApplicantByExternalId(externalId) {
  const url = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalId)}/one`;

  try {
    const response = await axios.get(url, {
      baseURL: SUMSUB_BASE_URL, // Set the base URL
      headers: {
        'Accept': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching applicant:', error.response?.data || error.message);
    throw error;
  }
}

// Function to get applicant metadata (image IDs)
async function getApplicantImageId(applicantId) {
  const url = `/resources/applicants/${applicantId}/metadata/resources`;

  try {
    const response = await axios.get(url, {
      baseURL: SUMSUB_BASE_URL, // Set the base URL
      headers: {
        'Accept': 'application/json',
      },
    });
    return response.data.items.map(item => item.id);
  } catch (error) {
    console.error('Error fetching applicant metadata:', error.response?.data || error.message);
    throw error;
  }
}

// Function to download an image
async function downloadImage(inspectionId, imageId) {
  const url = `/resources/inspections/${inspectionId}/resources/${imageId}`;

  try {
    const response = await axios.get(url, {
      baseURL: SUMSUB_BASE_URL, // Set the base URL
      headers: {
        'Accept': 'application/json',
      },
      responseType: 'arraybuffer', // To handle binary data (images)
    });
    return response.data;
  } catch (error) {
    console.error('Error downloading image:', error.response?.data || error.message);
    throw error;
  }
}

// Function to upload a file to AWS S3
async function uploadFileToS3(imageContent, filename, bucketName,userId) {
  const params = {
    Bucket: bucketName,
    Key: `user/${userId}/${filename}`,
    Body: imageContent,
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location; // Return the S3 file URL
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
}

async function updateUserKycStatus(userId) {
  try {
    // First, get all account managers
    const [accountManagers] = await DB.execute("SELECT id FROM account_managers");
    
    if (accountManagers.length === 0) {
      throw new Error('No account managers available');
    }

    // Select a random account manager
    const randomIndex = Math.floor(Math.random() * accountManagers.length);
    const randomAccountManager = accountManagers[randomIndex];
    
    // Update the user with KYC status and assign the account manager
    const query = `
      UPDATE users
      SET kyc_completed = ?, 
          is_approved = ?,
          account_manager_id = ?
      WHERE id = ?
    `;
    
    const values = [1, 1, randomAccountManager.id, userId];

    const [result] = await DB.execute(query, values);
    console.log(`User ${userId} KYC status updated successfully and assigned to account manager ${randomAccountManager.id}`);
    return result;
  } catch (error) {
    console.error('Error updating user KYC status:', error);
    throw error;
  }
}

async function getUserFilesFromS3(userId, bucketName) {
  const prefix = `user/${userId}/`;
  const params = {
    Bucket: bucketName,
    Prefix: prefix
  };

  try {
    const data = await s3.listObjectsV2(params).promise();
    
    if (!data.Contents || data.Contents.length === 0) {
      return [];
    }

    const files = await Promise.all(
      data.Contents.map(async (file) => {
        // Get file metadata
        const headParams = {
          Bucket: bucketName,
          Key: file.Key
        };
        const metadata = await s3.headObject(headParams).promise();
        
        return {
          key: file.Key,
          filename: metadata.Metadata['original-filename'] || file.Key.split('/').pop(),
          url: `https://${bucketName}.s3.amazonaws.com/${file.Key}`,
          fileType: metadata.Metadata['file-type'] || 'unknown',
          size: file.Size,
          lastModified: file.LastModified,
          metadata: metadata.Metadata
        };
      })
    );

    return files;
  } catch (error) {
    console.error('Error fetching user files from S3:', error);
    throw error;
  }
}

// Main function to fetch and upload documents
module.exports = {
  fetchUploadDoc: async (req, res) => {
    const { userId } = req.body;
    const bucketName = process.env.AWS_BUCKET_NAME;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    try {
      // Step 1: Get applicant data
      const applicantData = await getApplicantByExternalId(userId);
      const applicantId = applicantData.id;
      const inspectionId = applicantData.inspectionId;

      // Step 2: Get applicant metadata (image IDs)
      const imageIds = await getApplicantImageId(applicantId);

      // Step 3: Download and upload each image
      for (const imageId of imageIds) {
        const imageContent = await downloadImage(inspectionId, imageId);
        const filename = `document_${imageId}.jpg`; // Adjust file extension as needed
        const s3Url = await uploadFileToS3(imageContent, filename, bucketName,userId);
        console.log('Uploaded to S3:', s3Url);
      }
      await updateUserKycStatus(userId);

      res.status(200).json({ message: 'Documents uploaded and KYC status updated successfully.' });
    } catch (error) {
      console.error('Error in fetchAndUploadDocuments:', error);
      res.status(500).json({ error: 'Failed to fetch and upload documents.' });
    }
  },

  handleGetUserFiles: async (req, res) => {
    try {
      const { userId } = req.params;
      const files = await getUserFilesFromS3(userId, process.env.AWS_BUCKET_NAME);
      res.status(200).json(files);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};