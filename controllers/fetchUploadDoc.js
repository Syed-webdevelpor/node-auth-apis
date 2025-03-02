const axios = require('axios');
const AWS = require('aws-sdk');
const crypto = require('crypto');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });

module.exports = {
  fetchUploadDoc: async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
      // Step 1: Fetch applicant data from Sumsub
      const applicantResponse = await axios.get(
        `https://api.sumsub.com/resources/applicants/-;externalUserId=${encodeURIComponent(userId)}/one`,
        {
          headers: {
            'X-App-Token': process.env.SUMSUB_APP_TOKEN,
            'X-App-Access-Ts': Math.floor(Date.now() / 1000),
          },
        }
      );

      const applicantId = applicantResponse.data.id;
      const inspectionId = applicantResponse.data.inspectionId;

      // Step 2: Fetch applicant metadata (documents)
      const metadataResponse = await axios.get(
        `https://api.sumsub.com/resources/applicants/${applicantId}/metadata/resources`,
        {
          headers: {
            'X-App-Token': process.env.SUMSUB_APP_TOKEN,
            'X-App-Access-Sig': createSignature('GET', `/resources/applicants/${applicantId}/metadata/resources`),
            'X-App-Access-Ts': Math.floor(Date.now() / 1000),
          },
        }
      );

      const documents = metadataResponse.data.items;

      // Step 3: Download and upload each document to AWS S3
      for (const document of documents) {
        const imageId = document.id;
        const fileType = document.fileMetadata.fileType;

        // Download the document
        const imageResponse = await axios.get(
          `https://api.sumsub.com/resources/inspections/${inspectionId}/resources/${imageId}`,
          {
            headers: {
              'X-App-Token': process.env.SUMSUB_APP_TOKEN,
              'X-App-Access-Ts': Math.floor(Date.now() / 1000),
            },
            responseType: 'arraybuffer',
          }
        );

        const imageContent = imageResponse.data;

        // Upload to AWS S3
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `user/${userId}/doc_${imageId}.${fileType}`,
          Body: imageContent,
        };

        await s3.upload(params).promise();
      }

      res.status(200).json({ message: 'Documents uploaded successfully.' });
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to fetch and upload documents.' });
    }
  },
};

// Helper function to create Sumsub signature
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