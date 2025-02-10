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

const attachments = [
  {
    filename: 'logo.jpeg',
    path: './public/images/logo.jpeg',
    cid: 'investain_logo', // This will reference the image in HTML
  },
  {
    filename: 'app_gallery.png',
    path: './public/images/app_gallery.png',
    cid: 'app_gallery', // This will reference the image in HTML
  },
  {
    filename: 'play_store.png',
    path: './public/images/play_store.png',
    cid: 'play_store', // This will reference the image in HTML
  },
  {
    filename: 'app_store.png',
    path: './public/images/app_store.png',
    cid: 'app_store', // This will reference the image in HTML
  },

];

// Function to send a verification email
const sendVerificationEmail = async (recipientEmail, verificationLink, customerName) => {
  const mailOptions = {
    from: 'support@investain.com', // Verified sender email
    to: recipientEmail, // Verified recipient email
    subject: 'Please Verify Your Email Address',
    html: `<html>
<head>
    <style>
        /* Media query for mobile view */

            .download-app-container img {
                width: 60px; /* Smaller size for mobile */
            }
        }
    </style>
</head>
<body style="font-family: Rajdhani, sans-serif; background-color: #f7f7f7; color: #4d4d4d; padding: 20px; margin: 0;">
    <!-- Main Container -->
    <div
        style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <!-- Logo Section (Header) -->
        <div style="text-align: center; padding: 20px;">
        <a href="https://investain.com"
                style="text-decoration: none;">
            <img src="cid:investain_logo" alt="INVESTAiN Logo" style="width: 100px; height: 100px;" /></a>
        </div>

        <!-- Email Verification Section (Body) -->
       
    </div>
    <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
        <h3 style="color: #333; text-align: center; margin: 0 0 20px 0;">Verify Your E-mail!</h3>
        <p style="text-align: left; margin: 0 0 10px 0;">Dear ${customerName},</p>
        <p style="font-size: 16px; text-align: left; margin: 0;">
            Verify your email by clicking this <a href="${verificationLink}" style="color: red; font-weight: bold;">link</a>
        </p>
    </div>

    <div
        style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="text-align: center; padding-top: 40px;">
          <h2 style="color: #333; margin: 0 0 10px 0;">Download our App</h2>
      </div>
        <div class="download-app-container" style="text-align: center; padding: 20px;">
            <a href="https://apps.apple.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:app_store" alt="Download on App Store" style="width: 120px;">
            </a>
            <a href="https://play.google.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:play_store" alt="Download on Google Play" style="width: 120px;">
            </a>
            <a href="https://appgallery.huawei.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:app_gallery" alt="Download on App Gallery" style="width: 120px;">
            </a>
        </div>

        <!-- Social Media Icons -->
        <div style="text-align: center; padding: 20px; ">
            <a href="https://facebook.com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://x.com/investain_com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124021.png" alt="Twitter"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://www.linkedin.com/company/investain/" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124011.png" alt="LinkedIn"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://instagram.com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram"
                    style="width: 24px; height: 24px;">
            </a>
        </div>

        <!-- Contact Us Section -->
        <div style="text-align: center; padding: 20px;">
            <h3 style="color: #333; margin: 0 0 10px 0;">Contact us</h3>
            <p style="font-size: 16px; margin: 0;">For any inquiries please reach us at
                <strong style="color: red;">support@investain.com</strong>
            </p>
        </div>

        <!-- Footer -->
        <div
            style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <p style="font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
        </div>
    </div>
</body>

</html>`,
    attachments: attachments,
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
      html: `<html>

<body style="font-family: Rajdhani, sans-serif; background-color: #f7f7f7; color: #4d4d4d; padding: 20px; margin: 0;">
    <!-- Main Container -->
    <div
        style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <!-- Logo Section (Header) -->
        <div style="text-align: center; padding: 20px;">
        <a href="https://investain.com"
                style="text-decoration: none;">
            <img src="cid:investain_logo" alt="INVESTAiN Logo" style="width: 100px; height: 100px;" /></a>
        </div>    
        </div>
        <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
<p>Dear ${customerName},</p>
        <p>We are excited to welcome you to <strong>INVESTAiN</strong>. Your trading account has been successfully created.</p>

<p>To start trading, please complete your KYC verification by uploading the required documents. This step is essential for account approval.</p>

<p><a href="https://portal.investain.com/live-account/step4" style="color: #d32f2f; text-decoration: underline; font-weight: bold;">Click here</a> to upload your documents</p>
                  </div>
         <div
        style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="text-align: center; padding-top: 40px;">
          <h2 style="color: #333; margin: 0 0 10px 0;">Download our App</h2>
      </div>
        <div style="text-align: center; padding: 20px;">
            <a href="https://apps.apple.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:app_store" alt="Download on App Store" style="width: 120px;">
            </a>
            <a href="https://play.google.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:play_store" alt="Download on Google Play" style="width: 120px;">
            </a>
            <a href="https://appgallery.huawei.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:app_gallery" alt="Download on App Gallery" style="width: 120px;">
            </a>
        </div>

        <!-- Social Media Icons -->
        <div style="text-align: center; padding: 20px; ">
            <a href="https://facebook.com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://x.com/investain_com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124021.png" alt="Twitter"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://www.linkedin.com/company/investain/" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124011.png" alt="LinkedIn"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://instagram.com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram"
                    style="width: 24px; height: 24px;">
            </a>
        </div>

        <!-- Contact Us Section -->
        <div style="text-align: center; padding: 20px;">
            <h3 style="color: #333; margin: 0 0 10px 0;">Contact us</h3>
            <p style="font-size: 16px; margin: 0;">For any inquiries please reach us at
                <strong style="color: red;">support@investain.com</strong>
            </p>
        </div>

        <!-- Footer -->
        <div
            style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <p style="font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
        </div>
    </div> 
    </body>
</html>`,
      attachments: attachments,
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
      html: `<html>

<body style="font-family: Rajdhani, sans-serif; background-color: #f7f7f7; color: #4d4d4d; padding: 20px; margin: 0;">
    <!-- Main Container -->
    <div
        style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <!-- Logo Section (Header) -->
        <div style="text-align: center; padding: 20px;">
        <a href="https://investain.com"
                style="text-decoration: none;">
            <img src="cid:investain_logo" alt="INVESTAiN Logo" style="width: 100px; height: 100px;" /></a>
        </div>    
        </div>
        <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
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

</div>
         <div
        style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="text-align: center; padding-top: 40px;">
          <h2 style="color: #333; margin: 0 0 10px 0;">Download our App</h2>
      </div>
        <div style="text-align: center; padding: 20px;">
            <a href="https://apps.apple.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:app_store" alt="Download on App Store" style="width: 120px;">
            </a>
            <a href="https://play.google.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:play_store" alt="Download on Google Play" style="width: 120px;">
            </a>
            <a href="https://appgallery.huawei.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:app_gallery" alt="Download on App Gallery" style="width: 120px;">
            </a>
        </div>

        <!-- Social Media Icons -->
        <div style="text-align: center; padding: 20px; ">
            <a href="https://facebook.com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://x.com/investain_com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124021.png" alt="Twitter"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://www.linkedin.com/company/investain/" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124011.png" alt="LinkedIn"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://instagram.com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram"
                    style="width: 24px; height: 24px;">
            </a>
        </div>

        <!-- Contact Us Section -->
        <div style="text-align: center; padding: 20px;">
            <h3 style="color: #333; margin: 0 0 10px 0;">Contact us</h3>
            <p style="font-size: 16px; margin: 0;">For any inquiries please reach us at
                <strong style="color: red;">support@investain.com</strong>
            </p>
        </div>

        <!-- Footer -->
        <div
            style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <p style="font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
        </div>
    </div> 
    </body>
</html> `,
      attachments: attachments,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Demo Account Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email of demo account:', error);
  }
}

const forgetPasswordEmail = async (email, resetLink, customerName) => {
  try {
    const mailOptions = {
      from: 'support@investain.com',
      to: email,
      subject: 'Reset Your Password – INVESTAiN',
      html: `<html>

<body style="font-family: Rajdhani, sans-serif; background-color: #f7f7f7; color: #4d4d4d; padding: 20px; margin: 0;">
    <!-- Main Container -->
    <div
        style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <!-- Logo Section (Header) -->
        <div style="text-align: center; padding: 20px;">
        <a href="https://investain.com"
                style="text-decoration: none;">
            <img src="cid:investain_logo" alt="INVESTAiN Logo" style="width: 100px; height: 100px;" /></a>
        </div>    
        </div>
        <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
          <h3 style="color: #333;">Password Reset Request</h3>
          <p>Dear ${customerName},</p>
          <p style="font-size: 16px;">
            We received a request to reset your password for your account at <strong>INVESTAiN</strong>.
            please click this <a href="${resetLink}" style="color: red; font-weight: bold;">link</a> reset your password:
          </p>
          <p style="font-size: 14px; color: #666;">
            If you did not request to reset your password, please ignore this email or contact our support team if you have concerns.
          </p>
          <p style="font-size: 14px; color: #666;">
            This link will expire in 15 minutes for your security.
          </p>
        </div>
         <div
        style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="text-align: center; padding-top: 40px;">
          <h2 style="color: #333; margin: 0 0 10px 0;">Download our App</h2>
      </div>
        <div style="text-align: center; padding: 20px;">
            <a href="https://apps.apple.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:app_store" alt="Download on App Store" style="width: 120px;">
            </a>
            <a href="https://play.google.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:play_store" alt="Download on Google Play" style="width: 120px;">
            </a>
            <a href="https://appgallery.huawei.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:app_gallery" alt="Download on App Gallery" style="width: 120px;">
            </a>
        </div>

        <!-- Social Media Icons -->
        <div style="text-align: center; padding: 20px; ">
            <a href="https://facebook.com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://x.com/investain_com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124021.png" alt="Twitter"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://www.linkedin.com/company/investain/" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124011.png" alt="LinkedIn"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://instagram.com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram"
                    style="width: 24px; height: 24px;">
            </a>
        </div>

        <!-- Contact Us Section -->
        <div style="text-align: center; padding: 20px;">
            <h3 style="color: #333; margin: 0 0 10px 0;">Contact us</h3>
            <p style="font-size: 16px; margin: 0;">For any inquiries please reach us at
                <strong style="color: red;">support@investain.com</strong>
            </p>
        </div>

        <!-- Footer -->
        <div
            style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <p style="font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
        </div>
    </div> 
    </body>
</html>
      `,
      attachments: attachments,
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
      html: `<html>

<body style="font-family: Rajdhani, sans-serif; background-color: #f7f7f7; color: #4d4d4d; padding: 20px; margin: 0;">
    <!-- Main Container -->
    <div
        style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <!-- Logo Section (Header) -->
        <div style="text-align: center; padding: 20px;">
        <a href="https://investain.com"
                style="text-decoration: none;">
            <img src="cid:investain_logo" alt="INVESTAiN Logo" style="width: 100px; height: 100px;" /></a>
        </div>    
        </div>
        <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
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

</div>
         <div
        style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="text-align: center; padding-top: 40px;">
          <h2 style="color: #333; margin: 0 0 10px 0;">Download our App</h2>
      </div>
        <div style="text-align: center; padding: 20px;">
            <a href="https://apps.apple.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:app_store" alt="Download on App Store" style="width: 120px;">
            </a>
            <a href="https://play.google.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:play_store" alt="Download on Google Play" style="width: 120px;">
            </a>
            <a href="https://appgallery.huawei.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:app_gallery" alt="Download on App Gallery" style="width: 120px;">
            </a>
        </div>

        <!-- Social Media Icons -->
        <div style="text-align: center; padding: 20px; ">
            <a href="https://facebook.com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://x.com/investain_com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124021.png" alt="Twitter"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://www.linkedin.com/company/investain/" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124011.png" alt="LinkedIn"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://instagram.com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram"
                    style="width: 24px; height: 24px;">
            </a>
        </div>

        <!-- Contact Us Section -->
        <div style="text-align: center; padding: 20px;">
            <h3 style="color: #333; margin: 0 0 10px 0;">Contact us</h3>
            <p style="font-size: 16px; margin: 0;">For any inquiries please reach us at
                <strong style="color: red;">support@investain.com</strong>
            </p>
        </div>

        <!-- Footer -->
        <div
            style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <p style="font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
        </div>
    </div> 
    </body>
</html>
          `,
      attachments: attachments,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Transaction notification email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending transaction notification email:', error);
  }
}

const sendOtpEmail = async (recipientEmail, otp, customerName) => {
  const mailOptions = {
    from: 'support@investain.com', // Verified sender email
    to: recipientEmail, // Verified recipient email
    subject: 'Your OTP for Account Verification',
    html: `<html>

<body style="font-family: Rajdhani, sans-serif; background-color: #f7f7f7; color: #4d4d4d; padding: 20px; margin: 0;">
    <!-- Main Container -->
    <div
        style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <!-- Logo Section (Header) -->
        <div style="text-align: center; padding: 20px;">
        <a href="https://investain.com"
                style="text-decoration: none;">
            <img src="cid:investain_logo" alt="INVESTAiN Logo" style="width: 100px; height: 100px;" /></a>
        </div>    
        </div>
        <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <h3 style="color: #333;">Verify Your Account</h3>
                <p>Dear ${customerName},</p>
                <p style="font-size: 16px;">We received a request to verify your account. Use the following OTP to complete the process:</p>
                <p style="font-size: 24px; font-weight: bold; color: #e74c3c; margin: 20px 0;">${otp}</p>
                <p style="font-size: 14px; color: #666;">This OTP is valid for the next 10 minutes. Please do not share it with anyone.</p>
</div>
         <div
        style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="text-align: center; padding-top: 40px;">
          <h2 style="color: #333; margin: 0 0 10px 0;">Download our App</h2>
      </div>
        <div style="text-align: center; padding: 20px;">
            <a href="https://apps.apple.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:app_store" alt="Download on App Store" style="width: 120px;">
            </a>
            <a href="https://play.google.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:play_store" alt="Download on Google Play" style="width: 120px;">
            </a>
            <a href="https://appgallery.huawei.com"
                style="text-decoration: none; display: inline-block; margin: 0 10px; vertical-align: middle;">
                <img src="cid:app_gallery" alt="Download on App Gallery" style="width: 120px;">
            </a>
        </div>

        <!-- Social Media Icons -->
        <div style="text-align: center; padding: 20px; ">
            <a href="https://facebook.com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://x.com/investain_com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124021.png" alt="Twitter"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://www.linkedin.com/company/investain/" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/124/124011.png" alt="LinkedIn"
                    style="width: 24px; height: 24px;">
            </a>
            <a href="https://instagram.com" style="margin: 0 10px; display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram"
                    style="width: 24px; height: 24px;">
            </a>
        </div>

        <!-- Contact Us Section -->
        <div style="text-align: center; padding: 20px;">
            <h3 style="color: #333; margin: 0 0 10px 0;">Contact us</h3>
            <p style="font-size: 16px; margin: 0;">For any inquiries please reach us at
                <strong style="color: red;">support@investain.com</strong>
            </p>
        </div>

        <!-- Footer -->
        <div
            style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <p style="font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
        </div>
    </div> 
    </body>
</html>`,
    attachments: attachments,
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


module.exports = { sendVerificationEmail, sendTradingAccountEmail, sendDemoAccountEmail, forgetPasswordEmail, sendTransactionNotificationEmail, sendOtpEmail };
