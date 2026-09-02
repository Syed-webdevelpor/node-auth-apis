const twilio = require("twilio");
const { sendSMS } = require("../middlewares/sns.js");
const axios = require("axios");
const { logRecaptcha } = require("../middlewares/authentication.js");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

/**
 * Verify reCAPTCHA for web platform.
 *
 * Mobile platform skips reCAPTCHA verification.
 *
 * @param {Object} req - Express request
 * @param {string|null|undefined} recaptchaToken - reCAPTCHA token
 * @param {string} action - Expected reCAPTCHA action
 * @returns {Promise<Object>}
 */
const verifyRecaptcha = async (req, recaptchaToken, action) => {
  const { platform } = req.body;

  // Mobile platform does not require reCAPTCHA
  if (platform === "mobile") {
    return {
      success: true,
      skipped: true,
      reason: "mobile_platform",
    };
  }

  // Only allow supported platforms
  if (platform !== "web") {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid platform. Platform must be either mobile or web.",
    };
  }

  // Web platform requires reCAPTCHA token
  if (!recaptchaToken) {
    await logRecaptcha({
      ip_address: req.ip,
      user_agent: req.headers["user-agent"] || "",
      recaptcha_score: null,
      recaptcha_action: action,
      route: req.originalUrl,
      status: "fail",
    });

    return {
      success: false,
      statusCode: 400,
      message: "reCAPTCHA token is required",
    };
  }

  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

  if (!recaptchaSecret) {
    return {
      success: false,
      statusCode: 500,
      message: "reCAPTCHA not configured",
    };
  }

  let recaptchaData;

  try {
    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      new URLSearchParams({
        secret: recaptchaSecret,
        response: recaptchaToken,
        remoteip: req.ip,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    recaptchaData = response.data;
  } catch (recaptchaError) {
    console.error(
      "reCAPTCHA verification error:",
      recaptchaError.message
    );

    await logRecaptcha({
      ip_address: req.ip,
      user_agent: req.headers["user-agent"] || "",
      recaptcha_score: null,
      recaptcha_action: action,
      route: req.originalUrl,
      status: "error",
    });

    return {
      success: false,
      statusCode: 500,
      message: "Server error during reCAPTCHA verification.",
    };
  }

  // Check reCAPTCHA success and score
  if (
    !recaptchaData.success ||
    (recaptchaData.score !== undefined && recaptchaData.score < 0.7)
  ) {
    await logRecaptcha({
      ip_address: req.ip,
      user_agent: req.headers["user-agent"] || "",
      recaptcha_score: recaptchaData.score || null,
      recaptcha_action: action,
      route: req.originalUrl,
      status: "fail",
    });

    return {
      success: false,
      statusCode: 403,
      message: "reCAPTCHA verification failed.",
    };
  }

  // Validate reCAPTCHA action
  if (recaptchaData.action !== action) {
    await logRecaptcha({
      ip_address: req.ip,
      user_agent: req.headers["user-agent"] || "",
      recaptcha_score: recaptchaData.score || null,
      recaptcha_action: recaptchaData.action || "unknown",
      route: req.originalUrl,
      status: "fail",
    });

    return {
      success: false,
      statusCode: 403,
      message: "Invalid reCAPTCHA action.",
    };
  }

  // reCAPTCHA passed
  await logRecaptcha({
    ip_address: req.ip,
    user_agent: req.headers["user-agent"] || "",
    recaptcha_score: recaptchaData.score,
    recaptcha_action: action,
    route: req.originalUrl,
    status: "pass",
  });

  return {
    success: true,
    skipped: false,
    score: recaptchaData.score,
  };
};

// Request OTP
exports.requestOtp = async (req, res) => {
  const { phoneNumber, recaptchaToken, platform } = req.body;

  // Validate required fields
  if (!phoneNumber) {
    await logRecaptcha({
      ip_address: req.ip,
      user_agent: req.headers["user-agent"] || "",
      recaptcha_score: null,
      recaptcha_action: "requestOtp",
      route: req.originalUrl,
      status: "fail",
    });

    return res.status(400).json({
      error: "Phone number is required",
    });
  }

  // Validate platform
  if (platform !== "mobile" && platform !== "web") {
    return res.status(400).json({
      error: "Invalid platform. Platform must be either mobile or web.",
    });
  }

  // Verify reCAPTCHA for web only
  const recaptchaResult = await verifyRecaptcha(
    req,
    recaptchaToken,
    "requestOtp"
  );

  if (!recaptchaResult.success) {
    return res.status(recaptchaResult.statusCode).json({
      status: "error",
      message: recaptchaResult.message,
    });
  }

  try {
    const message = await sendSMS(phoneNumber);

    console.log(message);

    return res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("OTP Error:", error);

    return res.status(500).json({
      error: "Failed to send OTP",
    });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  const { phoneNumber, code, recaptchaToken, platform } = req.body;

  // Validate required fields
  if (!phoneNumber || !code) {
    await logRecaptcha({
      ip_address: req.ip,
      user_agent: req.headers["user-agent"] || "",
      recaptcha_score: null,
      recaptcha_action: "verifyOtp",
      route: req.originalUrl,
      status: "fail",
    });

    return res.status(400).json({
      error: "Phone number and OTP code are required",
    });
  }

  // Validate platform
  if (platform !== "mobile" && platform !== "web") {
    return res.status(400).json({
      error: "Invalid platform. Platform must be either mobile or web.",
    });
  }

  // Verify reCAPTCHA for web only
  const recaptchaResult = await verifyRecaptcha(
    req,
    recaptchaToken,
    "verifyOtp"
  );

  if (!recaptchaResult.success) {
    return res.status(recaptchaResult.statusCode).json({
      status: "error",
      message: recaptchaResult.message,
    });
  }

  try {
    const verification_check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: code,
      });

    if (verification_check.status === "approved") {
      return res.status(200).json({
        message: "Phone number verified successfully",
      });
    }

    return res.status(400).json({
      error: "Invalid or expired OTP",
    });
  } catch (error) {
    console.error("OTP Verify Error:", error);

    return res.status(500).json({
      error: "Failed to verify OTP",
    });
  }
};