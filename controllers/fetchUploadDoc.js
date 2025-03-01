const axios = require('axios');
const crypto = require('crypto');
const AWS = require('aws-sdk');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Helper function to create Sumsub signature
function createSignature(ts, method, url, body = '') {
  const signature = crypto.createHmac('sha256', process.env.SUMSUB_SECRET_KEY);
  signature.update(ts + method.toUpperCase() + url);
  return signature.digest('hex');
}

// Function to get applicant by external ID
async function getApplicantByExternalId(externalId) {
  const ts = Math.floor(Date.now() / 1000);
  const url = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalId)}/one`;
  const signature = createSignature(ts, 'GET', url);

  try {
    const response = await axios.get(`${process.env.SUMSUB_BASE_URL}${url}`, {
      headers: {
        'Accept': 'application/json',
        'X-App-Token': process.env.SUMSUB_APP_TOKEN,
        'X-App-Access-Ts': ts,
        'X-App-Access-Sig': signature,
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
  const ts = Math.floor(Date.now() / 1000);
  const url = `/resources/applicants/${applicantId}/metadata/resources`;
  const signature = createSignature(ts, 'GET', url);

  try {
    const response = await axios.get(`${process.env.SUMSUB_BASE_URL}${url}`, {
      headers: {
        'Accept': 'application/json',
        'X-App-Token': process.env.SUMSUB_APP_TOKEN,
        'X-App-Access-Ts': ts,
        'X-App-Access-Sig': signature,
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
  const ts = Math.floor(Date.now() / 1000);
  const url = `/resources/inspections/${inspectionId}/resources/${imageId}`;
  const signature = createSignature(ts, 'GET', url);

  try {
    const response = await axios.get(`${process.env.SUMSUB_BASE_URL}${url}`, {
      headers: {
        'Accept': 'application/json',
        'X-App-Token': process.env.SUMSUB_APP_TOKEN,
        'X-App-Access-Ts': ts,
        'X-App-Access-Sig': signature,
      },
      responseType: 'arraybuffer',
    });
    return response.data;
  } catch (error) {
    console.error('Error downloading image:', error.response?.data || error.message);
    throw error;
  }
}

// Function to upload a file to AWS S3
async function uploadFileToS3(imageContent, filename, bucketName) {
  const params = {
    Bucket: bucketName,
    Key: `user-documents/${filename}`,
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


module.exports = {
  fetchUploadDoc: async (req, res)=> {
    const { userId } = req.body;
  const bucketName = process.env.AWS_BUCKET_NAME;
    if (!userId) {
      return res.status(400).json({ error: 'userId are required.' });
    }
  
    try {
  
      // Step 2: Get applicant data
      const applicantData = await getApplicantByExternalId(userId);
      const applicantId = applicantData.id;
      const inspectionId = applicantData.inspectionId;
      console.log('Applicant ID:', applicantId);
      console.log('Inspection ID:', inspectionId);
  
      // Step 3: Get applicant metadata (image IDs)
      const imageIds = await getApplicantImageId(applicantId);
      console.log('Image IDs:', imageIds);
  
      // Step 4: Download and upload each image
      for (const imageId of imageIds) {
        const imageContent = await downloadImage(inspectionId, imageId);
        const filename = `document_${imageId}.jpg`; // Adjust file extension as needed
        const s3Url = await uploadFileToS3(imageContent, filename, bucketName);
        console.log('Uploaded to S3:', s3Url);
      }
  
      res.status(200).json({ message: 'Documents uploaded successfully.' });
    } catch (error) {
      console.error('Error in fetchAndUploadDocuments:', error);
      res.status(500).json({ error: 'Failed to fetch and upload documents.' });
    }
  } 
};