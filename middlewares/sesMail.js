const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');

// Set up Nodemailer transporter with SES
const transporter = nodemailer.createTransport({
    SES: new AWS.SES({
        region: process.env.AWS_REGION, // Specify your SES region
        credentials: new AWS.Credentials({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID, // AWS Access Key
            secretAccessKey: process.env.AWS_SES_SECRET, // AWS Secret Key
        }),
    }),
});

const attachments = [
    {
        filename: 'logo.png',
        path: './public/images/logo.png',
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
    {
        filename: 'fb.png',
        path: './public/images/fb.png',
        cid: 'fb_logo', // This will reference the image in HTML
    },
    {
        filename: 'insta.png',
        path: './public/images/insta.png',
        cid: 'insta_logo', // This will reference the image in HTML
    },
    {
        filename: 'linkdin.png',
        path: './public/images/linkdin.png',
        cid: 'linkdin_logo', // This will reference the image in HTML
    },
    {
        filename: 'twitter.png',
        path: './public/images/twitter.png',
        cid: 'twitter_logo', // This will reference the image in HTML
    },

];

// Function to send a verification email
const sendVerificationEmail = async (recipientEmail, verificationLink, customerName) => {
    const mailOptions = {
        from: `"INVESTAiN" <support@investain.com>`, // Verified sender email
        to: recipientEmail, // Verified recipient email
        subject: 'Please Verify Your Email Address',
        html: `<html>
            <head>
                <style>
                    @media screen and (max-width: 600px) {
                        .download-app-container td {
                        display: block;
                        width: 100% !important;
                        text-align: center !important;
                        }
                        .download-img {
                        width: 135px !important;
                        margin-bottom: 5px !important; /* Adds spacing between images */
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
            <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
        </div>

        <!-- Email Verification Section (Body) -->
       
    </div>
    <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
        <h3 style="font-family: Rajdhani, sans-serif; color: #333; text-align: center; margin: 0 0 20px 0; font-size:20px;">Verify Your E-mail!</h3>
        <p style="font-family: Rajdhani, sans-serif; text-align: left; margin: 0 0 10px 0;">Dear ${customerName},</p>
        <p style="font-family: Rajdhani, sans-serif; font-size: 16px; text-align: left; margin: 0;">
            Verify your email by clicking this <a href="${verificationLink}" style="color: red; font-weight: bold;">link</a>
        </p>
    </div>

    <div
        style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="text-align: center; padding-top: 40px;">
          <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
      </div>
        <table align="center" role="presentation" style="width: 100%; text-align: center;">
        <tr class="download-app-container">
            <td>
            <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 130px; width: 100%;">
            </a>
            </td>
            <td>
            <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 130px; width: 100%;">
            </a>
            </td>
            <td>
            <a href="https://appgallery.huawei.com">
                <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 130px; width: 100%;">
            </a>
            </td>
        </tr>
        </table>

        <!-- Social Media Icons -->
        <table align="center" cellpadding="10">
            <tr>
                <td>
                    <a href="https://facebook.com">
                        <img src="cid:fb_logo" alt="Facebook"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://x.com/investain_com">
                        <img src="cid:twitter_logo" alt="Twitter"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://www.linkedin.com/company/investain/">
                        <img src="cid:linkdin_logo" alt="LinkedIn"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://instagram.com">
                        <img src="cid:insta_logo" alt="Instagram"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
            </tr>
        </table>

        <!-- Contact Us Section -->
        <div style="text-align: center; padding: 20px;">
            <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
            <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
            </p>
        </div>

        <!-- Footer -->
        <div
            style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
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
const sendTradingAccountEmail = async (customerEmail, customerName, accountType, accountNumber, link, leverage) => {
    try {
        // Email template
        const mailOptions = {
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: customerEmail,
            subject: 'Welcome to INVESTAiN – Your Trading Account is Ready!',
            html: `<html>
            <head>
                <style>
                    @media screen and (max-width: 600px) {
                        .download-app-container td {
                        display: block;
                        width: 100% !important;
                        text-align: center !important;
                        }
                        .download-img {
                        width: 135px !important;
                        margin-bottom: 5px !important; /* Adds spacing between images */
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
            <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
        </div>    
        </div>
        <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
        <p style="font-family: Rajdhani, sans-serif;">Dear ${customerName},</p>
        <p style="font-family: Rajdhani, sans-serif;">We are excited to welcome you to <strong>INVESTAiN</strong>. Your trading account has been successfully created.</p>

        <p style="font-family: Rajdhani, sans-serif;">Your Trading account details are: </p>
              <ul style="font-family: Rajdhani, sans-serif;">
                    <li>Trading Server: INVESTAiN SERVER</li>
                    <li>Login: ${accountNumber}</li>
                    <li>Password: Use the same password you created during your application</li>
                    <li>Leverage: ${leverage}</li>
                </ul>
        <p style="font-family: Rajdhani, sans-serif; font-weight:bold;">How to Fund Your Account: </p>
                <ul style="font-family: Rajdhani, sans-serif;">
                    <li>Log in to the <a href="${link}" style="color: red; font-weight: bold;">INVESTAiN</a> Client Portal.</li>
                    <li>Go to the "Deposits" section.</li>
                    <li>Select your preferred funding method.</li>
                </ul>
                 <p style="font-family: Rajdhani, sans-serif;">Important Notes: </p>
                 <p style="font-family: Rajdhani, sans-serif;">Deposits will be credited to your chosen wallet or trading account.</p>
                 <p style="font-family: Rajdhani, sans-serif;">We do not charge additional fees for deposits unless stated on our Deposits and Withdrawals page.</p>
                 <p style="font-family: Rajdhani, sans-serif;">Third-party payments are not accepted. Any such transactions will be returned to the original payment source where possible.</p>
                 <p style="font-family: Rajdhani, sans-serif;">Our Client Support team is available 24/5 to assist you. Feel free to reach out through any of our support channels.</p>
                 </div>
         <div
        style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="text-align: center; padding-top: 40px;">
          <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
      </div>
    <table align="center" role="presentation" style="width: 100%; text-align: center;">
        <tr class="download-app-container">
            <td>
                <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
            <td>
                <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
            <td>
                <a href="https://appgallery.huawei.com">
                <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
        </tr>
    </table>

        <!-- Social Media Icons -->
 <table align="center" cellpadding="10">
            <tr>
                <td>
                    <a href="https://facebook.com">
                        <img src="cid:fb_logo" alt="Facebook"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://x.com/investain_com">
                        <img src="cid:twitter_logo" alt="Twitter"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://www.linkedin.com/company/investain/">
                        <img src="cid:linkdin_logo" alt="LinkedIn"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://instagram.com">
                        <img src="cid:insta_logo" alt="Instagram"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
            </tr>
        </table>

        <!-- Contact Us Section -->
        <div style="text-align: center; padding: 20px;">
            <h3 style="color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
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
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: customerEmail,
            subject: 'Welcome to INVESTAiN – Your Demo Account is Ready!',
            html: `<html>
            <head>
                <style>
                    @media screen and (max-width: 600px) {
                        .download-app-container td {
                        display: block;
                        width: 100% !important;
                        text-align: center !important;
                        }
                        .download-img {
                        width: 135px !important;
                        margin-bottom: 5px !important; /* Adds spacing between images */
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
            <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
        </div>    
        </div>
        <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
              <p style="font-family: Rajdhani, sans-serif;">Dear ${customerName},</p>

              <p style="font-family: Rajdhani, sans-serif;">Thank you for choosing <strong>INVESTAiN</strong> to explore the world of trading. Your demo account has been successfully created, allowing you to practice and refine your trading strategies risk-free.</p>

              <p style="font-family: Rajdhani, sans-serif;"><strong>Account Details:</strong></p>
              <ul style="font-family: Rajdhani, sans-serif;">
                  <li>Account Type: Demo</li>
                  <li>Account Number: ${accountNumber}</li>
              </ul>

              <p style="font-family: Rajdhani, sans-serif;">You can access your demo account using our platform via your registered credentials. This account comes preloaded with virtual funds, enabling you to test your trading strategies in a real-time market environment.</p>

              <p style="font-family: Rajdhani, sans-serif;"> <strong>How to Get Started:</strong></p>
              <ul style="font-family: Rajdhani, sans-serif;">
                  <li>Log in to your account through our platform.</li>
                  <li>Explore the tools, charts, and features available.</li>
                  <li>Practice trading without any financial risk.</li>
              </ul>

              <p style="font-family: Rajdhani, sans-serif;">If you have any questions or need assistance, our support team is here to help. Feel free to reach out to us at <a href="mailto:support@investain.com">support@investain.com</a>.</p>

              <p style="font-family: Rajdhani, sans-serif;">We’re excited to support you as you gain confidence in your trading skills.</p>

</div>
         <div
        style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="text-align: center; padding-top: 40px;">
          <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
      </div>
    <table align="center" role="presentation" style="width: 100%; text-align: center;">
        <tr class="download-app-container">
            <td>
                <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
            <td>
                <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
            <td>
                <a href="https://appgallery.huawei.com">
                <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
        </tr>
    </table>

        <!-- Social Media Icons -->
 <table align="center" cellpadding="10">
            <tr>
                <td>
                    <a href="https://facebook.com">
                        <img src="cid:fb_logo" alt="Facebook"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://x.com/investain_com">
                        <img src="cid:twitter_logo" alt="Twitter"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://www.linkedin.com/company/investain/">
                        <img src="cid:linkdin_logo" alt="LinkedIn"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://instagram.com">
                        <img src="cid:insta_logo" alt="Instagram"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
            </tr>
        </table>

        <!-- Contact Us Section -->
        <div style="text-align: center; padding: 20px;">
            <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
            <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
            </p>
        </div>

        <!-- Footer -->
        <div
            style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
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
            from: `"INVESTAiN" <support@investain.com>`,
            to: email,
            subject: 'Reset Your Password – INVESTAiN',
            html: `<html>
            <head>
                <style>
                    @media screen and (max-width: 600px) {
                        .download-app-container td {
                        display: block;
                        width: 100% !important;
                        text-align: center !important;
                        }
                        .download-img {
                        width: 135px !important;
                        margin-bottom: 5px !important; /* Adds spacing between images */
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
            <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
        </div>    
        </div>
        <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
          <h3 style="font-family: Rajdhani, sans-serif; font-size:20px; color: #333;">Password Reset Request</h3>
          <p style="font-family: Rajdhani, sans-serif;">Dear ${customerName},</p>
          <p style="font-family: Rajdhani, sans-serif; font-size: 16px;">
            We received a request to reset your password for your account at <strong>INVESTAiN</strong>.
            please click this <a href="${resetLink}" style="font-family: Rajdhani, sans-serif; color: red; font-weight: bold;">link</a> reset your password:
          </p>
          <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #666;">
            If you did not request to reset your password, please ignore this email or contact our support team if you have concerns.
          </p>
          <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #666;">
            This link will expire in 15 minutes for your security.
          </p>
        </div>
         <div
        style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="text-align: center; padding-top: 40px;">
          <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
      </div>
    <table align="center" role="presentation" style="width: 100%; text-align: center;">
        <tr class="download-app-container">
            <td>
                <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
            <td>
                <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
            <td>
                <a href="https://appgallery.huawei.com">
                <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
        </tr>
    </table>

        <!-- Social Media Icons -->
 <table align="center" cellpadding="10">
            <tr>
                <td>
                    <a href="https://facebook.com">
                        <img src="cid:fb_logo" alt="Facebook"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://x.com/investain_com">
                        <img src="cid:twitter_logo" alt="Twitter"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://www.linkedin.com/company/investain/">
                        <img src="cid:linkdin_logo" alt="LinkedIn"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://instagram.com">
                        <img src="cid:insta_logo" alt="Instagram"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
            </tr>
        </table>

        <!-- Contact Us Section -->
        <div style="text-align: center; padding: 20px;">
            <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
            <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
            </p>
        </div>

        <!-- Footer -->
        <div
            style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
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
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: customerEmail,
            subject: `Transaction Notification – ${transactionType} for Your Account`,
            html: `<html>
            <head>
                <style>
                    @media screen and (max-width: 600px) {
                        .download-app-container td {
                        display: block;
                        width: 100% !important;
                        text-align: center !important;
                        }
                        .download-img {
                        width: 135px !important;
                        margin-bottom: 5px !important; /* Adds spacing between images */
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
            <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
        </div>    
        </div>
        <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
              <p style="font-family: Rajdhani, sans-serif;">Dear ${customerName},</p>

              <p style="font-family: Rajdhani, sans-serif;">We are writing to inform you about a recent transaction made on your account. Below are the details of the ${transactionType.toLowerCase()} for your account:</p>

              <p style="font-family: Rajdhani, sans-serif;"><strong>Transaction Details:</strong></p>
              <ul style="font-family: Rajdhani, sans-serif;">
                  <li>Transaction Type: ${transactionType}</li>
                  <li>Amount: ${transactionAmount}</li>
                  <li>Date: ${transactionDate}</li>
                  <li>Account Number: ${accountNumber}</li>
                  <li>Transaction ID: ${transactionId}</li>
              </ul>

              <p style="font-family: Rajdhani, sans-serif;">${transactionDetails}</p>

              <p style="font-family: Rajdhani, sans-serif;">If you have any questions regarding this transaction or need further assistance, please don’t hesitate to reach out to our support team at <a href="mailto:support@investain.com">support@investain.com</a>.</p>

              <p style="font-family: Rajdhani, sans-serif;">We appreciate your trust in <strong>INVESTAiN</strong> and look forward to assisting you in your trading journey.</p>

</div>
         <div
        style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="text-align: center; padding-top: 40px;">
          <h3 style="style="font-family: Rajdhani, sans-serif;" color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
      </div>
    <table align="center" role="presentation" style="width: 100%; text-align: center;">
        <tr class="download-app-container">
            <td>
                <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
            <td>
                <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
            <td>
                <a href="https://appgallery.huawei.com">
                <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
        </tr>
    </table>

        <!-- Social Media Icons -->
 <table align="center" cellpadding="10">
            <tr>
                <td>
                    <a href="https://facebook.com">
                        <img src="cid:fb_logo" alt="Facebook"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://x.com/investain_com">
                        <img src="cid:twitter_logo" alt="Twitter"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://www.linkedin.com/company/investain/">
                        <img src="cid:linkdin_logo" alt="LinkedIn"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://instagram.com">
                        <img src="cid:insta_logo" alt="Instagram"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
            </tr>
        </table>

        <!-- Contact Us Section -->
        <div style="text-align: center; padding: 20px;">
            <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
            <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
            </p>
        </div>

        <!-- Footer -->
        <div
            style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
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
        from: `"INVESTAiN" <support@investain.com>`, // Verified sender email
        to: recipientEmail, // Verified recipient email
        subject: 'Your OTP for Account Verification',
        html: `<html>
            <head>
                <style>
                    @media screen and (max-width: 600px) {
                        .download-app-container td {
                        display: block;
                        width: 100% !important;
                        text-align: center !important;
                        }
                        .download-img {
                        width: 135px !important;
                        margin-bottom: 5px !important; /* Adds spacing between images */
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
            <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
        </div>    
        </div>
        <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <h3 style="font-family: Rajdhani, sans-serif; font-size:20px; color: #333;">Verify Your Account</h3>
                <p style="font-family: Rajdhani, sans-serif;">Dear ${customerName},</p>
                <p style="font-family: Rajdhani, sans-serif; font-size: 16px;">We received a request to verify your account. Use the following OTP to complete the process:</p>
                <p style="font-family: Rajdhani, sans-serif; font-size: 24px; font-weight: bold; color: #e74c3c; margin: 20px 0;">${otp}</p>
                <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #666;">This OTP is valid for the next 10 minutes. Please do not share it with anyone.</p>
</div>
         <div
        style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
      <div style="text-align: center; padding-top: 40px;">
          <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
      </div>
    <table align="center" role="presentation" style="width: 100%; text-align: center;">
        <tr class="download-app-container">
            <td>
                <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
            <td>
                <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
            <td>
                <a href="https://appgallery.huawei.com">
                <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                </a>
            </td>
        </tr>
    </table>

        <!-- Social Media Icons -->
 <table align="center" cellpadding="10">
            <tr>
                <td>
                    <a href="https://facebook.com">
                        <img src="cid:fb_logo" alt="Facebook"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://x.com/investain_com">
                        <img src="cid:twitter_logo" alt="Twitter"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://www.linkedin.com/company/investain/">
                        <img src="cid:linkdin_logo" alt="LinkedIn"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
                <td>
                    <a href="https://instagram.com">
                        <img src="cid:insta_logo" alt="Instagram"
                            style="width: 24px; height: 24px;">
                    </a>
                </td>
            </tr>
        </table>

        <!-- Contact Us Section -->
        <div style="text-align: center; padding: 20px;">
            <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
            <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
            </p>
        </div>

        <!-- Footer -->
        <div
            style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
            <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
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

async function sendWithdrawalEmail(userId, selectedAccount, amount, accountName, bankName, branchName, swiftBic, iban, date) {
    try {

        // Email template
        const mailOptions = {
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: 'withdrawl@investain.com',
            subject: `Withdrawal Request Details`,
            html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>    
          </div>
          <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <p style="font-family: Rajdhani, sans-serif;">Dear,</p>
  
                <p style="font-family: Rajdhani, sans-serif;">A new withdrawal request has been initiated by a user. Below are the details of the request:</p>
  
                <ul style="font-family: Rajdhani, sans-serif;">
                    <li>User ID: ${userId}</li>
                    <li>Account: ${selectedAccount}</li>
                    <li>Amount: ${amount}</li>
                    <li>Date: ${date}</li>
                    <li>Payment Method: Bank Transfer</li>
                </ul>
                <p style="font-family: Rajdhani, sans-serif;"><strong>Transaction Details:</strong></p>
                <ul style="font-family: Rajdhani, sans-serif;">
                    <li>Account Holder Name: ${accountName}</li>
                    <li>Bank Name: ${bankName}</li>
                    <li>Branch Name: ${branchName}</li>
                    <li>SWIFT/BIC: ${swiftBic}</li>
                    <li>IBAN: ${iban}</li>
                </ul>
                <p style="font-family: Rajdhani, sans-serif;">Please review the request and take the necessary action to process it. If you require any additional information, feel free to reach out to the user directly.</p>
  
  </div>
           <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="style="font-family: Rajdhani, sans-serif;" color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
      <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
                  <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
          </tr>
      </table>
  
          <!-- Social Media Icons -->
   <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
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
        return info.response;
    } catch (error) {
        console.error('Error sending transaction notification email:', error);
        return error;
    }
}

const newAccountRegister = async (id, username, email, phoneNumber, account_type, account_nature, referredBy, date) => {
    const mailOptions = {
        from: `"INVESTAiN" <support@investain.com>`, // Verified sender email
        to: 'accounts@investain.com', // Verified recipient email
        subject: 'New Account Creation',
        html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>
  
          <!-- Email Verification Section (Body) -->
         
      </div>
      <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <p style="font-family: Rajdhani, sans-serif;">A new Real account has been created.</p>
                <ul style="font-family: Rajdhani, sans-serif;">
                    <li>User ID: ${id}</li>
                    <li>Name: ${username}</li>
                    <li>Email: ${email}</li>
                    <li>Phone Number: ${phoneNumber}</li>
                    <li>Account: ${account_type}</li>
                    <li>Account Nature: ${account_nature}</li>
                    <li>Reffered By: ${referredBy}</li>
                    <li>Date: ${date}</li>
                </ul>
      </div>
  
      <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
          <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
              <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 130px; width: 100%;">
              </a>
              </td>
              <td>
              <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 130px; width: 100%;">
              </a>
              </td>
              <td>
              <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 130px; width: 100%;">
              </a>
              </td>
          </tr>
          </table>
  
          <!-- Social Media Icons -->
          <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div>
  </body>
  
  </html>`,
        attachments: attachments,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('new account creation email sent!', info);
        return { success: true, info };
    } catch (error) {
        console.error('Error sending email of verification user: ', error);
        return { success: false, error };
    }
};

const demoAccountCreation = async (id, firstName, lastName, email, phoneNumber, country, experience, expectedInvestment) => {
    const mailOptions = {
        from: `"INVESTAiN" <support@investain.com>`, // Verified sender email
        to: 'demo@investain.com', // Verified recipient email
        subject: 'New Demo Account Creation',
        html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>
  
          <!-- Email Verification Section (Body) -->
         
      </div>
      <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <p style="font-family: Rajdhani, sans-serif;">A new Demo account has successfully been created.</p>
                <p style="font-family: Rajdhani, sans-serif;">Detail:</p>
                <ul style="font-family: Rajdhani, sans-serif;">
                    <li>User ID: ${id}</li>
                    <li>Name: ${firstName} ${lastName}</li>
                    <li>Email: ${email}</li>
                    <li>Phone Number: ${phoneNumber}</li>
                    <li>Country: ${country}</li>
                    <li>Experience: ${experience}</li>
                    <li>Expected Investment: ${expectedInvestment}</li>
                </ul>
      </div>
  
      <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
          <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
              <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 130px; width: 100%;">
              </a>
              </td>
              <td>
              <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 130px; width: 100%;">
              </a>
              </td>
              <td>
              <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 130px; width: 100%;">
              </a>
              </td>
          </tr>
          </table>
  
          <!-- Social Media Icons -->
          <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div>
  </body>
  
  </html>`,
        attachments: attachments,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('new demo account creation email sent!', info);
        return { success: true, info };
    } catch (error) {
        console.error('Error sending email of verification user: ', error);
        return { success: false, error };
    }
};

const applicationSubmissionEmail = async (email, link, customerName) => {
    const mailOptions = {
        from: `"INVESTAiN" <support@investain.com>`, // Verified sender email
        to: email, // Verified recipient email
        subject: 'Your INVESTAiN account application has been submitted',
        html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>
  
          <!-- Email Verification Section (Body) -->
         
      </div>
      <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
          <p style="font-family: Rajdhani, sans-serif; text-align: left; margin: 0 0 10px 0;">Dear ${customerName},</p>
          <p style="font-family: Rajdhani, sans-serif; font-size: 16px; text-align: left; margin: 0;">
              Thank you for applying for a trading account with INVESTAiN.
          </p>
            <p style="font-family: Rajdhani, sans-serif; font-size: 16px; text-align: left; margin: 0;">
              Your account application is now complete, and we just need a few documents to verify your identity and address. Please upload the following:
          </p>
                <ul style="font-family: Rajdhani, sans-serif;">
                    <li>Proof of identity (Passport, National ID, or Driver’s License)</li>
                    <li>Liveness check</li>
                    <li>Proof of address (Utility bill, Bank statement, or Government-issued document)</li>
                </ul>
          <p style="font-family: Rajdhani, sans-serif; font-size: 16px; text-align: left; margin: 0;">
              Upload Your Documents
          </p>
          <p style="font-family: Rajdhani, sans-serif; font-size: 16px; text-align: left; margin: 0;">
              <a href="${link}" style="color: red; font-weight: bold;">Log in</a> using the email and password you created during your application to submit your documents securely.
          </p>
          <p style="font-family: Rajdhani, sans-serif; font-size: 16px; text-align: left; margin: 0;">
              What’s Next?
          </p>
          <p style="font-family: Rajdhani, sans-serif; font-size: 16px; text-align: left; margin: 0;">
              Once uploaded, our onboarding team will review and verify your documents within one working day.
          </p>
          <p style="font-family: Rajdhani, sans-serif; font-size: 16px; text-align: left; margin: 0;">
              If you have any questions or need assistance, feel free to reach out to our support team.
          </p>
      </div>
  
      <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
          <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
              <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 130px; width: 100%;">
              </a>
              </td>
              <td>
              <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 130px; width: 100%;">
              </a>
              </td>
              <td>
              <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 130px; width: 100%;">
              </a>
              </td>
          </tr>
          </table>
  
          <!-- Social Media Icons -->
          <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div>
  </body>
  
  </html>`,
        attachments: attachments,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('application success email sent!', info);
        return { success: true, info };
    } catch (error) {
        console.error('Error sending email of verification user: ', error);
        return { success: false, error };
    }
};

async function sendNewTradingAccountReqEmail(user_id, platform, currency, account_type, reason) {
    try {

        // Email template
        const mailOptions = {
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: 'accounts@investain.com',
            subject: `New Additional Trading Account Request – User ID: ${user_id}`,
            html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>    
          </div>
          <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <p style="font-family: Rajdhani, sans-serif;">Dear Admin,</p>
  
                <p style="font-family: Rajdhani, sans-serif;">A user has requested an additional trading account on INVESTAiN. Below are the details of the request:</p>
  
                <ul style="font-family: Rajdhani, sans-serif;">
                    <li>User ID: ${user_id}</li>
                    <li>Platform: ${platform}</li>
                    <li>Currency: ${currency}</li>
                    <li>Account Type: ${account_type}</li>
                    <li>Reason for Request: ${reason}</li>
                </ul>
                <p style="font-family: Rajdhani, sans-serif;">Please review the request and take the necessary action to process it. If you require any additional information, feel free to reach out to the user directly.</p>
  
  </div>
           <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="style="font-family: Rajdhani, sans-serif;" color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
      <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
                  <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
          </tr>
      </table>
  
          <!-- Social Media Icons -->
   <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div> 
      </body>
  </html>
            `,
            attachments: attachments,
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('New Trading account request email sent: ' + info.response);
        return info.response;
    } catch (error) {
        console.error('Error sending New Trading account request email:', error);
        return error;
    }
}

async function sendNewTradingAccountReqToAccManagerEmail(email, user_id, platform, currency, account_type, reason) {
    try {

        // Email template
        const mailOptions = {
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: email,
            subject: `New Additional Trading Account Request – User ID: ${user_id}`,
            html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>    
          </div>
          <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <p style="font-family: Rajdhani, sans-serif;">Dear Account Manager,</p>
  
                <p style="font-family: Rajdhani, sans-serif;">A user has requested an additional trading account on INVESTAiN. Below are the details of the request:</p>
  
                <ul style="font-family: Rajdhani, sans-serif;">
                    <li>User ID: ${user_id}</li>
                    <li>Platform: ${platform}</li>
                    <li>Currency: ${currency}</li>
                    <li>Account Type: ${account_type}</li>
                    <li>Reason for Request: ${reason}</li>
                </ul>
                <p style="font-family: Rajdhani, sans-serif;">Please review the request and take the necessary action to process it. If you require any additional information, feel free to reach out to the user directly.</p>
  
  </div>
           <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="style="font-family: Rajdhani, sans-serif;" color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
      <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
                  <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
          </tr>
      </table>
  
          <!-- Social Media Icons -->
   <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div> 
      </body>
  </html>
            `,
            attachments: attachments,
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('New Trading account request email sent: ' + info.response);
        return info.response;
    } catch (error) {
        console.error('Error sending New Trading account request email:', error);
        return error;
    }
}

async function sendNewTradingAccountEmail(name, email) {
    try {

        // Email template
        const mailOptions = {
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: email,
            subject: `Trading Account Request Received`,
            html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>    
          </div>
          <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <p style="font-family: Rajdhani, sans-serif;">Dear ${name},</p>
  
                <p style="font-family: Rajdhani, sans-serif;">Thank you for submitting your trading account request. We have received your application and are currently reviewing it.</p>
                <p style="font-family: Rajdhani, sans-serif;">Our team will carefully assess your details, and we will inform you of the decision as soon as possible. If any additional information is required, we will reach out to you.</p>
                <p style="font-family: Rajdhani, sans-serif;">If you have any questions in the meantime, feel free to contact our support team.</p>
  </div>
           <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="style="font-family: Rajdhani, sans-serif;" color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
      <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
                  <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
          </tr>
      </table>
  
          <!-- Social Media Icons -->
   <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div> 
      </body>
  </html>
            `,
            attachments: attachments,
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('New Trading account request email sent: ' + info.response);
        return info.response;
    } catch (error) {
        console.error('Error sending New Trading account request email:', error);
        return error;
    }
}

async function sendNewIbEmail(name, email) {
    try {

        // Email template
        const mailOptions = {
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: email,
            subject: `Your Request to Become an IB Has Been Received`,
            html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>    
          </div>
          <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <p style="font-family: Rajdhani, sans-serif;">Dear ${name},</p>
  
                <p style="font-family: Rajdhani, sans-serif;">Thank you for your interest in becoming a Partner / Introducing Broker (IB) with INVESTAiN</p>
                <p style="font-family: Rajdhani, sans-serif;">We have received your request and our team will review your application shortly. One of our representatives will get in touch with you to discuss the next steps.</p>
                <p style="font-family: Rajdhani, sans-serif;">If you have any questions in the meantime, feel free to contact our support team.</p>
  </div>
           <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="style="font-family: Rajdhani, sans-serif;" color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
      <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
                  <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
          </tr>
      </table>
  
          <!-- Social Media Icons -->
   <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div> 
      </body>
  </html>
            `,
            attachments: attachments,
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('New IB request email sent: ' + info.response);
        return info.response;
    } catch (error) {
        console.error('Error sending New IB request email:', error);
        return error;
    }
}

async function sendIbReqEmail(username, email, phoneNumber, country) {
    try {

        // Email template
        const mailOptions = {
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: 'ib@investain.com',
            subject: `New Request to Become an IB`,
            html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>    
          </div>
          <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <p style="font-family: Rajdhani, sans-serif;">Dear Admin,</p>
  
                <p style="font-family: Rajdhani, sans-serif;">I am interested in becoming a Partner / Introducing Broker (IB) with INVESTAiN and would like to learn more about the requirements and opportunities available.</p>
                <strong>My Details:</strong>
                <ul style="font-family: Rajdhani, sans-serif;">
                    <li>Name: ${username}</li>
                    <li>Email: ${email}</li>
                    <li>Phone: ${phoneNumber}</li>
                    <li>Country: ${country}</li>
                </ul>
                <p style="font-family: Rajdhani, sans-serif;">I would appreciate it if you could provide me with more information regarding the IB program, commission structure, and the next steps in the application process.</p>
                <p style="font-family: Rajdhani, sans-serif;">Looking forward to your response.</p>
  </div>
           <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="style="font-family: Rajdhani, sans-serif;" color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
      <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
                  <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
          </tr>
      </table>
  
          <!-- Social Media Icons -->
   <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div> 
      </body>
  </html>
            `,
            attachments: attachments,
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('New IB request email sent: ' + info.response);
        return info.response;
    } catch (error) {
        console.error('Error sending New IB request email:', error);
        return error;
    }
}

async function sendDocReqEmail(email, name, title, description, dueDate, isUrgent, docType, requestType) {
    try {
        const docRequirementText =
            requestType === 'upload'
                ? 'Our compliance team requires additional documentation:'
                : 'Our compliance team requires legal documentation:';
        // Email template
        const mailOptions = {
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: email,
            subject: `Action Required: Document Submission`,
            html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>    
          </div>
          <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <p style="font-family: Rajdhani, sans-serif;">Dear ${name},</p>
  
                <p style="font-family: Rajdhani, sans-serif;">${docRequirementText}</p>
  
                <ul style="font-family: Rajdhani, sans-serif;">
                    <li>Document Title: ${title}</li>
                    <li>Document Type: ${docType}</li>
                    <li>Reason: ${description}</li>
                    <li>Is Urgent: ${isUrgent}</li>
                    <li>Due Date: ${dueDate}</li>
                </ul>
                <p style="font-family: Rajdhani, sans-serif;">Kindly upload this document via the INVESTAiN app or through the <a href="https://portal.investain.com/dashboard" style="color: red; font-weight: bold;">INVESTAiN portal</a> at your earliest convenience.</p>
  
  </div>
           <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="style="font-family: Rajdhani, sans-serif;" color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
      <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
                  <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
          </tr>
      </table>
  
          <!-- Social Media Icons -->
   <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div> 
      </body>
  </html>
            `,
            attachments: attachments,
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('New Document request email sent: ' + info.response);
        return info.response;
    } catch (error) {
        console.error('Error sending New Document request email:', error);
        return error;
    }
}

async function sendDocUploadedEmail(email, managerName, userId, name, title, docType, date) {
    try {

        // Email template
        const mailOptions = {
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: email,
            subject: `Document uploaded by ${userId}`,
            html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>    
          </div>
          <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <p style="font-family: Rajdhani, sans-serif;">Dear ${managerName},</p>
  
                <p style="font-family: Rajdhani, sans-serif;">I hope this message finds you well.</p>
                <p style="font-family: Rajdhani, sans-serif;">This is to inform you that ${name} (User ID: ${userId}) has successfully fulfilled the requested document submission. The required document has been uploaded to the system and is now available for your review.</p>
                                <p style="font-family: Rajdhani, sans-serif;">Document Details:</p>
                <ul style="font-family: Rajdhani, sans-serif;">
                    <li>Document Title: ${title}</li>
                    <li>Document Type: ${docType}</li>
                    <li>Uploaded On: ${date}</li>
                </ul>
  
  </div>
           <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="style="font-family: Rajdhani, sans-serif;" color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
      <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
                  <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
          </tr>
      </table>
  
          <!-- Social Media Icons -->
   <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div> 
      </body>
  </html>
            `,
            attachments: attachments,
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('Document upload email sent: ' + info.response);
        return info.response;
    } catch (error) {
        console.error('Error sending Document upload email:', error);
        return error;
    }
}

async function sendDocSignatureUploadedEmail(email, managerName, userId, name, title, date) {
    try {

        // Email template
        const mailOptions = {
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: email,
            subject: `Signature Document Uploaded by User ${userId}`,
            html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>    
          </div>
          <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <p style="font-family: Rajdhani, sans-serif;">Dear ${managerName},</p>
  
                <p style="font-family: Rajdhani, sans-serif;">I hope this message finds you well.</p>
                <p style="font-family: Rajdhani, sans-serif;">This is to notify you that the following user has uploaded their signed document(s) as required:</p>
                <ul style="font-family: Rajdhani, sans-serif;">
                    <li>User Name: ${name}</li>
                    <li>User ID/Account #: ${userId}</li>
                    <li>Uploaded On: ${date}</li>
                    <li>Document Title: ${title}</li>
                    <li>Date & Time of Upload: ${date}</li>
                    <li>Status: Completed</li>
                </ul>
            <p style="font-family: Rajdhani, sans-serif;">The documents are now available in  <a href="https://am.investain.com" style="background-color: red; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 4px;">Portal</a></p>
            <p style="font-family: Rajdhani, sans-serif;">Next Steps:</p>
            <p style="font-family: Rajdhani, sans-serif;">Kindly review the documents and approve or reject them at your earliest convenience.</p>
            </div>
           <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="style="font-family: Rajdhani, sans-serif;" color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
      <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
                  <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
          </tr>
      </table>
  
          <!-- Social Media Icons -->
   <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div> 
      </body>
  </html>
            `,
            attachments: attachments,
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('Document signature upload email sent: ' + info.response);
        return info.response;
    } catch (error) {
        console.error('Error sending Document signature upload email:', error);
        return error;
    }
}

async function sendDocUploadedEmailToUser(email, name, title, requestType) {
    try {

        // Email template
        const mailOptions = {
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: email,
            subject: `Your Document Request Has Been Submitted`,
            html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>    
          </div>
          <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <p style="font-family: Rajdhani, sans-serif;">Dear ${name},</p>
                <p style="font-family: Rajdhani, sans-serif;">Thank you for submitting your document ${title} via our platform. We have received your request and it is now under review.</p>
                <p style="font-family: Rajdhani, sans-serif;">Next Steps:</p>
                <p style="font-family: Rajdhani, sans-serif;">Our team will carefully verify the document for completeness and accuracy.</p>
                <p style="font-family: Rajdhani, sans-serif;">You will receive another notification once the review is complete, along with the approval status or any required next steps.</p>
                <p style="font-family: Rajdhani, sans-serif;">Processing time may vary depending on the request type ${requestType}.</p>
                <p style="font-family: Rajdhani, sans-serif;">Need Help?</p>
            <p style="font-family: Rajdhani, sans-serif;">If you have any questions or need to make changes to your submission, please reply to this email or contact our support team at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong></p>
            </div>
           <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="style="font-family: Rajdhani, sans-serif;" color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
      <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
                  <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
          </tr>
      </table>
  
          <!-- Social Media Icons -->
   <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div> 
      </body>
  </html>
            `,
            attachments: attachments,
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('Document upload by user email sent: ' + info.response);
        return info.response;
    } catch (error) {
        console.error('Error sending Document upload by user email:', error);
        return error;
    }
}

async function sendSupportTicketEmail(email, ticketId, subject, manager_name, user_name, category, priority, message, user_email, submittedAt) {
    try {

        // Email template
        const mailOptions = {
            from: `"INVESTAiN" <support@investain.com>`, // Replace with your email
            to: email,
            subject: `New Support Ticket Assigned to You: #${ticketId} - ${subject}`,
            html: `<html>
              <head>
                  <style>
                      @media screen and (max-width: 600px) {
                          .download-app-container td {
                          display: block;
                          width: 100% !important;
                          text-align: center !important;
                          }
                          .download-img {
                          width: 135px !important;
                          margin-bottom: 5px !important; /* Adds spacing between images */
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
              <img src="cid:investain_logo" alt="" style="width: 100px; height: 100px;" /></a>
          </div>    
          </div>
          <div style="padding: 20px; padding-top:50px; padding-bottom:50px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Dear ${manager_name},</h2>
            <p>A new support ticket has been assigned to you with the following details:</p>
            <ul style="font-size: 16px; line-height: 1.5;">
              <li><strong>Ticket ID:</strong> #${ticketId}</li>
              <li><strong>Submitted by:</strong> ${user_name}</li>
              <li><strong>Subject:</strong> ${subject}</li>
              <li><strong>Category:</strong> ${category}</li>
              <li><strong>Priority:</strong> <span style="color: ${priority === 'critical' ? 'red' :
                    priority === 'high' ? 'orange' :
                        priority === 'medium' ? 'blue' : 'green'
                }; font-weight: bold;">${priority}</span></li>
              <li><strong>Date Submitted:</strong> ${submittedAt}</li>
            </ul>
            <p><strong>Customer's Message:</strong></p>
            <blockquote style="background-color: #f9f9f9; border-left: 4px solid #ccc; padding: 10px; font-style: italic;">
              ${message}
            </blockquote>
            <p style="margin-top: 20px;">Please address this ticket within <strong>24 hours</strong>. You can view and respond to the ticket directly through our support portal.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://am.investain.com" style="background-color: red; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 4px;">View Ticket</a>
            </div>
            <p><strong>Customer Contact:</strong> ${user_email}</p>
            <p>Best regards,<br/>The INVESTAiN Team</p>
  
  </div>
           <div
          style=" max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
        <div style="text-align: center; padding-top: 40px;">
            <h3 style="style="font-family: Rajdhani, sans-serif;" color: #333; margin: 0 0 10px 0; font-size:16px;">Download our App</h3>
        </div>
      <table align="center" role="presentation" style="width: 100%; text-align: center;">
          <tr class="download-app-container">
              <td>
                  <a href="https://apps.apple.com/ae/app/investain/id6475628015">
                  <img src="cid:app_store" alt="Download on App Store" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://play.google.com/store/apps/details?id=com.investain.investain&pcampaignid=web_share">
                  <img src="cid:play_store" alt="Download on Google Play" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
              <td>
                  <a href="https://appgallery.huawei.com">
                  <img src="cid:app_gallery" alt="Download on App Gallery" class="download-img" width="120" style="max-width: 120px; width: 100%;">
                  </a>
              </td>
          </tr>
      </table>
  
          <!-- Social Media Icons -->
   <table align="center" cellpadding="10">
              <tr>
                  <td>
                      <a href="https://facebook.com">
                          <img src="cid:fb_logo" alt="Facebook"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://x.com/investain_com">
                          <img src="cid:twitter_logo" alt="Twitter"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://www.linkedin.com/company/investain/">
                          <img src="cid:linkdin_logo" alt="LinkedIn"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
                  <td>
                      <a href="https://instagram.com">
                          <img src="cid:insta_logo" alt="Instagram"
                              style="width: 24px; height: 24px;">
                      </a>
                  </td>
              </tr>
          </table>
  
          <!-- Contact Us Section -->
          <div style="text-align: center; padding: 20px;">
              <h3 style="font-family: Rajdhani, sans-serif; color: #333; margin: 0 0 10px 0; font-size:20px;">Contact us</h3>
              <p style="font-family: Rajdhani, sans-serif; font-size: 16px; margin: 0;">For any inquiries please reach us at
                  <strong style="font-family: Rajdhani, sans-serif; color: red;">support@investain.com</strong>
              </p>
          </div>
  
          <!-- Footer -->
          <div
              style="text-align: center; padding: 10px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="font-family: Rajdhani, sans-serif; font-size: 14px; color: #888; margin: 0;">&copy; 2025 INVESTAiN. All rights reserved.</p>
          </div>
      </div> 
      </body>
  </html>
            `,
            attachments: attachments,
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('support ticket email sent: ' + info.response);
        return info.response;
    } catch (error) {
        console.error('Error sending support ticket email:', error);
        return error;
    }
}

module.exports = { sendVerificationEmail, sendTradingAccountEmail, sendDemoAccountEmail, forgetPasswordEmail, sendTransactionNotificationEmail, sendOtpEmail, sendWithdrawalEmail, newAccountRegister, demoAccountCreation, applicationSubmissionEmail, sendNewTradingAccountReqEmail, sendNewTradingAccountEmail, sendNewIbEmail, sendIbReqEmail, sendNewTradingAccountReqToAccManagerEmail, sendDocReqEmail, sendDocUploadedEmail, sendSupportTicketEmail, sendDocSignatureUploadedEmail, sendDocUploadedEmailToUser };
