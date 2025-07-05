const { header } = require("express-validator");
const expressValidator = require("express-validator");
const { validationResult } = expressValidator;
const axios = require('axios');

// Token Validation Rule
const tokenValidation = (isRefresh = false) => {
  let refreshText = isRefresh ? "Refresh" : "Authorization";

  return [
    header("Authorization", `Please provide your ${refreshText} token`)
      .exists()
      .not()
      .isEmpty()
      .custom((value, { req }) => {
        if (!value.startsWith("Bearer") || !value.split(" ")[1]) {
          throw new Error(`Invalid ${refreshText} token`);
        }
        if (isRefresh) {
          req.headers.refresh_token = value.split(" ")[1];
          return true;
        }
        req.headers.access_token = value.split(" ")[1];
        return true;
      }),
  ];
};

const validation_result = validationResult.withDefaults({
  formatter: (error) => error.msg,
});

const validate = (req, res, next) => {
  const errors = validation_result(req).mapped();
  if (Object.keys(errors).length) {
    return res.status(422).json({
      status: 422,
      errors,
    });
  }
  next();
};

const DB = require("../dbConnection.js");

async function logRecaptcha({ ip_address, user_agent, recaptcha_score, recaptcha_action, route, status }) {
  try {
    await DB.execute(
      `INSERT INTO recaptcha_logs (ip_address, user_agent, recaptcha_score, recaptcha_action, route, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ip_address, user_agent, recaptcha_score, recaptcha_action, route, status]
    );
  } catch (err) {
    console.error("Failed to log recaptcha:", err.message);
  }
}

async function verifyRecaptcha(req, res, next) {
  try {
    const { recaptchaToken , platform } = req.body;
    if(platform === 'mobile'){
      return next();
    }

    if (!recaptchaToken) {
      await logRecaptcha({
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
        recaptcha_score: null,
        recaptcha_action: null,
        route: req.originalUrl,
        status: 'missing_token'
      });
      return res.status(400).json({ status: 'error', message: 'Missing reCAPTCHA token.' });
    }

    // 1. Verify token with Google using axios
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken,
        remoteip: req.ip,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const data = response.data;

    if (!data.success) {
      await logRecaptcha({
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
        recaptcha_score: data.score || null,
        recaptcha_action: data.action || null,
        route: req.originalUrl,
        status: 'failed'
      });
      return res.status(403).json({ status: 'error', message: 'reCAPTCHA verification failed.' });
    }

    // 2. Optional: Check action if you're using reCAPTCHA with action
    if (data.action !== 'signup' && data.action !== 'demoAccountForm' && data.action !== 'login') {
      await logRecaptcha({
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
        recaptcha_score: data.score || null,
        recaptcha_action: data.action || null,
        route: req.originalUrl,
        status: 'invalid_action'
      });
      return res.status(403).json({ status: 'error', message: 'Invalid reCAPTCHA action.' });
    }

    // 3. Score-based logic
    const score = data.score || 0;

    if (score >= 0.9) {
      req.recaptcha = { status: 'ok', score }; // Very safe
      await logRecaptcha({
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
        recaptcha_score: score,
        recaptcha_action: data.action,
        route: req.originalUrl,
        status: 'ok'
      });
    } else if (score >= 0.7) {
      req.recaptcha = { status: 'ok', score };
      await logRecaptcha({
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
        recaptcha_score: score,
        recaptcha_action: data.action,
        route: req.originalUrl,
        status: 'ok'
      });
    } else {
      await logRecaptcha({
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
        recaptcha_score: score,
        recaptcha_action: data.action,
        route: req.originalUrl,
        status: 'blocked'
      });
      return res.status(403).json({ status: 'blocked', message: 'Suspicious activity detected.', score });
    }

    next();
  } catch (error) {
    console.error("reCAPTCHA verification error:", error.message);
    await logRecaptcha({
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || '',
      recaptcha_score: null,
      recaptcha_action: null,
      route: req.originalUrl,
      status: 'error'
    });
    return res.status(500).json({ status: 'error', message: 'Server error during reCAPTCHA verification.' });
  }
}

module.exports = {
  tokenValidation,
  validate,
  verifyRecaptcha
};
