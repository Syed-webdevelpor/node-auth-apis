const nodemailer = require('nodemailer');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');

// Set up Nodemailer transporter with SES
const transporter = nodemailer.createTransport({
  SES: {
    ses: new (require('@aws-sdk/client-ses')).SESClient({ region: 'us-east-1' }),
    aws: { credentials: defaultProvider() },
  },
});

// Function to send a verification email
async function sendVerificationEmail(recipientEmail, verificationLink) {
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
}

module.exports = sendVerificationEmail();