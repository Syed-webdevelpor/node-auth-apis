const twilio = require("twilio");
const { sendSMS } = require('../middlewares/sns.js');
const axios = require('axios');
const { logRecaptcha } = require('../middlewares/authentication.js');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

// Request OTP
exports.requestOtp = async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

  try {
    let message = await sendSMS(phoneNumber);
    console.log(message);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('OTP Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  const { phoneNumber, code, recaptchaToken } = req.body;
  if (!phoneNumber || !code || !recaptchaToken) {
    await logRecaptcha({
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || '',
      recaptcha_score: null,
      recaptcha_action: 'verifyOtp',
      route: req.originalUrl,
      status: 'fail'
    });
    return res.status(400).json({ error: 'Phone number, OTP code and reCAPTCHA token are required' });
  }

  // reCAPTCHA verification
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
  if (!recaptchaSecret) {
    return res.status(500).json({ error: 'reCAPTCHA not configured' });
  }

  let recaptchaData;
  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      new URLSearchParams({
        secret: recaptchaSecret,
        response: recaptchaToken,
        remoteip: req.ip,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    recaptchaData = response.data;
  } catch (recaptchaError) {
    console.error('reCAPTCHA verification error:', recaptchaError.message);
    await logRecaptcha({
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || '',
      recaptcha_score: null,
      recaptcha_action: 'verifyOtp',
      route: req.originalUrl,
      status: 'error'
    });
    return res.status(500).json({ status: 'error', message: 'Server error during reCAPTCHA verification.' });
  }

  if (!recaptchaData.success || (recaptchaData.score && recaptchaData.score < 0.7)) {
    await logRecaptcha({
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || '',
      recaptcha_score: recaptchaData.score || null,
      recaptcha_action: 'verifyOtp',
      route: req.originalUrl,
      status: 'fail'
    });
    return res.status(403).json({ status: 'error', message: 'reCAPTCHA verification failed.' });
  }

  if (recaptchaData.action !== 'verifyOtp') {
    await logRecaptcha({
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || '',
      recaptcha_score: recaptchaData.score || null,
      recaptcha_action: recaptchaData.action || 'unknown',
      route: req.originalUrl,
      status: 'fail'
    });
    return res.status(403).json({ status: 'error', message: 'Invalid reCAPTCHA action.' });
  }

  // Pass
  req.recaptcha = { status: 'ok', score: recaptchaData.score };
  await logRecaptcha({
    ip_address: req.ip,
    user_agent: req.headers['user-agent'] || '',
    recaptcha_score: recaptchaData.score,
    recaptcha_action: 'verifyOtp',
    route: req.originalUrl,
    status: 'pass'
  });

  try {
    const verification_check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phoneNumber, code: code });

    if (verification_check.status === 'approved') {
      res.status(200).json({ message: 'Phone number verified successfully' });
    } else {
      res.status(400).json({ error: 'Invalid or expired OTP' });
    }
  } catch (error) {
    console.error('OTP Verify Error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};
