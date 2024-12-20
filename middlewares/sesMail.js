const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');

// Set up Nodemailer transporter with SES
const transporter = nodemailer.createTransport({
  SES: new AWS.SES({
    region: 'eu-north-1', // Specify your SES region
    credentials: new AWS.Credentials({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID, // AWS Access Key
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // AWS Secret Key
    }),
  }),
});

// Function to send a verification email
const sendVerificationEmail = async (recipientEmail, verificationLink) => {
  const mailOptions = {
    from: 'investain.app@gmail.com', // Verified sender email
    to: recipientEmail, // Verified recipient email
    subject: 'Verify Your Email Address',
    html: `<p>Click <a href="${verificationLink}">here</a> to verify your email address.</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent!', info);
    return { success: true, info };
  } catch (error) {
    console.error('Error sending email', error);
    return { success: false, error };
  }
};

module.exports = { sendVerificationEmail };
