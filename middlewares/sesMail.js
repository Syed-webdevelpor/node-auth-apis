const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');

// Set up Nodemailer transporter with SES
const transporter = nodemailer.createTransport({
  SES: new AWS.SES({
    region: process.env.AWS_REGION, // Specify your SES region
    credentials: new AWS.Credentials({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID, // AWS Access Key
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // AWS Secret Key
    }),
  }),
});

// Function to send a verification email
const sendVerificationEmail = async (recipientEmail, verificationLink) => {
  const mailOptions = {
    from: 'support@investain.com', // Verified sender email
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
    console.error('Error sending email of verification user: ', error);
    return { success: false, error };
  }
};

// Function to send a trading account creation email
const sendTradingAccountEmail = async (customerEmail, customerName, accountType, accountNumber) => {
  try {
    // Email template
    const mailOptions = {
      from: 'support@investain.com', // Replace with your email
      to: customerEmail,
      subject: 'Welcome to INVESTAiN – Your Trading Account is Ready!',
      html: `
              <p>Dear ${customerName},</p>

              <p>We are excited to welcome you to <strong>INVESTAiN</strong>. Your trading account has been successfully created, and you are now ready to begin your trading journey with us.</p>

              <p><strong>Account Details:</strong></p>
              <ul>
                  <li>Account Type: ${accountType}</li>
                  <li>Account Number: ${accountNumber}</li>
              </ul>

              <p>Should you have any questions or require assistance, our support team is available 24/5 to help you. You can reach us at <a href="mailto:support@investain.com">support@investain.com</a>.</p>

              <p>We’re thrilled to have you on board and look forward to supporting your trading success.</p>

              <p>Best regards,</p>
              <p>The INVESTAiN Team</p>
          `,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Trading Account Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email of trading account:', error);
  }
}

const sendDemoAccountEmail = async (customerEmail, customerName, accountNumber) => {
  try {

    // Email template
    const mailOptions = {
      from: 'support@investain.com', // Replace with your email
      to: customerEmail,
      subject: 'Welcome to INVESTAiN – Your Demo Account is Ready!',
      html: `
              <p>Dear ${customerName},</p>

              <p>Thank you for choosing <strong>INVESTAiN</strong> to explore the world of trading. Your demo account has been successfully created, allowing you to practice and refine your trading strategies risk-free.</p>

              <p><strong>Account Details:</strong></p>
              <ul>
                  <li>Account Type: Demo</li>
                  <li>Account Number: ${accountNumber}</li>
              </ul>

              <p>You can access your demo account using our platform via your registered credentials. This account comes preloaded with virtual funds, enabling you to test your trading strategies in a real-time market environment.</p>

              <p><strong>How to Get Started:</strong></p>
              <ul>
                  <li>Log in to your account through our platform.</li>
                  <li>Explore the tools, charts, and features available.</li>
                  <li>Practice trading without any financial risk.</li>
              </ul>

              <p>If you have any questions or need assistance, our support team is here to help. Feel free to reach out to us at <a href="mailto:support@investain.com">support@investain.com</a>.</p>

              <p>We’re excited to support you as you gain confidence in your trading skills.</p>

              <p>Best regards,</p>
              <p>The INVESTAiN Team</p>
          `,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Demo Account Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email of demo account:', error);
  }
}

const forgetPasswordEmail = async (email, resetLink) => {
  try {
    const mailOptions = {
      from: 'support@investain.com',
      to: email,
      subject: 'Reset Your Password – INVESTAiN',
      html: `<html>
  <body style="font-family: Arial, sans-serif; background-color: #f7f7f7; color: #333; padding: 20px;">
    <table width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="background-color: #4d4d4d; padding: 20px; color: white;">
          <h2 style="margin: 0;">INVESTAiN</h2>
          <p style="font-size: 18px;">Reset Your Password</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 40px 20px; background-color: white; border: 1px solid #ddd; border-top: none;">
          <h3 style="color: #333;">Password Reset Request</h3>
          <p style="font-size: 16px;">
            We received a request to reset your password for your account at <strong>INVESTAiN</strong>.
            If you made this request, please click the button below to reset your password:
          </p>
          <p>
            <a href="${resetLink}" style="background-color: red; color: white; padding: 12px 30px; text-decoration: none; font-size: 16px; border-radius: 4px; text-align: center;">Reset My Password</a>
          </p>
          <p style="font-size: 14px; color: #666;">
            If you did not request to reset your password, please ignore this email or contact our support team if you have concerns.
          </p>
          <p style="font-size: 14px; color: #666;">
            This link will expire in 15 minutes for your security.
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 10px; background-color: #f7f7f7; border-top: 1px solid #ddd;">
          <p style="font-size: 14px; color: #888;">&copy; 2024 INVESTAiN. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </body>
</html>
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('Forget Password Email sent: ' + info.response);
    return info.response;
  } catch (error) {
    console.error('Error sending email of Forget Password:', error);
  }
}

async function sendTransactionNotificationEmail(customerEmail, customerName, transactionType, transactionAmount, transactionDate, accountNumber, transactionId, sourceWallet = '', destinationWallet = '') {
  try {

      // Determine transaction details message
      let transactionDetails = '';
      if (transactionType === 'Deposit') {
          transactionDetails = 'Your deposit has been successfully processed, and the funds have been credited to your account. You can now use the available balance for trading.';
      } else if (transactionType === 'Withdrawal') {
          transactionDetails = 'Your withdrawal request has been successfully processed. Please check your bank/wallet account for the transferred amount.';
      } else if (transactionType === 'Transfer') {
          transactionDetails = `A transfer between your wallets has been successfully completed. The funds have been moved from ${sourceWallet} to ${destinationWallet}.`;
      }

      // Email template
      const mailOptions = {
          from: 'support@investain.com', // Replace with your email
          to: customerEmail,
          subject: `Transaction Notification – ${transactionType} for Your Account`,
          html: `
              <p>Dear ${customerName},</p>

              <p>We are writing to inform you about a recent transaction made on your account. Below are the details of the ${transactionType.toLowerCase()} for your account:</p>

              <p><strong>Transaction Details:</strong></p>
              <ul>
                  <li>Transaction Type: ${transactionType}</li>
                  <li>Amount: ${transactionAmount}</li>
                  <li>Date: ${transactionDate}</li>
                  <li>Account Number: ${accountNumber}</li>
                  <li>Transaction ID: ${transactionId}</li>
              </ul>

              <p>${transactionDetails}</p>

              <p>If you have any questions regarding this transaction or need further assistance, please don’t hesitate to reach out to our support team at <a href="mailto:support@investain.com">support@investain.com</a>.</p>

              <p>We appreciate your trust in <strong>INVESTAiN</strong> and look forward to assisting you in your trading journey.</p>

              <p>Best regards,</p>
              <p>The INVESTAiN Team</p>
          `,
      };

      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log('Transaction notification email sent: ' + info.response);
  } catch (error) {
      console.error('Error sending transaction notification email:', error);
  }
}

const sendOtpEmail = async (recipientEmail, otp) => {
  const mailOptions = {
    from: 'support@investain.com', // Verified sender email
    to: recipientEmail, // Verified recipient email
    subject: 'Your OTP for Account Verification',
    html: `<html>
        <body style="font-family: Arial, sans-serif; background-color: #f7f7f7; color: #333; padding: 20px;">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td align="center" style="background-color: #4d4d4d; padding: 20px; color: white;">
                <h2 style="margin: 0;">INVESTAiN</h2>
                <p style="font-size: 18px;">Your One-Time Password (OTP)</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 40px 20px; background-color: white; border: 1px solid #ddd; border-top: none;">
                <h3 style="color: #333;">Verify Your Account</h3>
                <p style="font-size: 16px;">We received a request to verify your account. Use the following OTP to complete the process:</p>
                <p style="font-size: 24px; font-weight: bold; color: #e74c3c; margin: 20px 0;">${otp}</p>
                <p style="font-size: 14px; color: #666;">This OTP is valid for the next 10 minutes. Please do not share it with anyone.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 10px; background-color: #f7f7f7; border-top: 1px solid #ddd;">
                <p style="font-size: 14px; color: #888;">If you did not request this, please ignore this email or contact support immediately.</p>
                <p style="font-size: 14px; color: #888;">&copy; 2024 INVESTAiN. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent!', info);
    return { success: true, info };
  } catch (error) {
    console.error('Error sending OTP email: ', error);
    return { success: false, error };
  }
};


module.exports = { sendVerificationEmail, sendTradingAccountEmail, sendDemoAccountEmail, forgetPasswordEmail,sendTransactionNotificationEmail, sendOtpEmail };
