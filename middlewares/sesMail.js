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
    subject: 'Please Verify Your Email Address',
    html: `<html>
        <body style="font-family: Arial, sans-serif; background-color: #f7f7f7; color: #333; padding: 20px;">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td align="center" style="background-color: #4d4d4d; padding: 20px; color: white;">
                <h2 style="margin: 0;">INVESTAiN</h2>
                <p style="font-size: 18px;">Your email address verification</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 40px 20px; background-color: white; border: 1px solid #ddd; border-top: none;">
                <h3 style="color: #333;">Verify Your Email Address</h3>
                <p style="font-size: 16px;">Thank you for registering with INVESTAiN! Please click the button below to verify your email address and complete the registration process.</p>
                <p>
                  <a href="${verificationLink}" style="background-color: red; color: white; padding: 12px 30px; text-decoration: none; font-size: 16px; border-radius: 4px; text-align: center;">Verify Email</a>
                </p>
                <p style="font-size: 14px; color: #666;">If you did not create an account, no further action is required.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 10px; background-color: #f7f7f7; border-top: 1px solid #ddd;">
                <p style="font-size: 14px; color: #888;">&copy; 2024 INVESTAiN. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>`,
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
