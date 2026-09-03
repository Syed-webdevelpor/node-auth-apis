const axios = require("axios");
const config = require("./config");
const { logSecurity } = require("./securityLogger");
const { logRecaptcha } = require("../../middlewares/authentication.js");

// Injectable for tests (defaults to the real axios implementation).
let httpPost = axios.post;

// Injectable for tests so security-log persistence (DB) can be stubbed.
let recaptchaLogger = logRecaptcha;

function _setHttpPostForTest(fn) {
  httpPost = fn;
  return () => { httpPost = axios.post; };
}

function _setLogRecaptchaForTest(fn) {
  recaptchaLogger = fn;
  return () => { recaptchaLogger = logRecaptcha; };
}

/**
 * Verify a Google reCAPTCHA v3 token server-side.
 *
 * Verifies:
 *   - Google `success`
 *   - score >= RECAPTCHA_MIN_SCORE
 *   - action matches the expected action (requestOtp / verifyOtp)
 *
 * Keeps the existing reCAPTCHA logging behavior and does not weaken any
 * existing validation.
 *
 * @param {object} req - Express request
 * @param {string|null|undefined} recaptchaToken
 * @param {string} action - expected action
 * @returns {Promise<{ success: boolean, statusCode?: number, message?: string, skipped?: boolean }>}
 */
async function verifyRecaptcha(req, recaptchaToken, action) {
  const ip = req.ip;
  const userAgent = req.headers["user-agent"] || "";

  // reCAPTCHA is only required on the web platform. The caller guarantees the
  // platform is valid before invoking this helper.
  if (!recaptchaToken) {
    await recaptchaLogger({
      ip_address: ip,
      user_agent: userAgent,
      recaptcha_score: null,
      recaptcha_action: action,
      route: req.originalUrl,
      status: "fail",
    });
    logSecurity({ platform: "web", operation: "recaptcha", result: "block", reason: "missing_token" });
    return { success: false, statusCode: 400, message: "reCAPTCHA token is required" };
  }

  if (!config.RECAPTCHA_SECRET_KEY) {
    logSecurity({ platform: "web", operation: "recaptcha", result: "error", reason: "not_configured" });
    return { success: false, statusCode: 500, message: "reCAPTCHA not configured" };
  }

  let recaptchaData;
  try {
    const response = await httpPost(
      "https://www.google.com/recaptcha/api/siteverify",
      new URLSearchParams({
        secret: config.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken,
        remoteip: ip,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    recaptchaData = response.data;
  } catch (e) {
    await recaptchaLogger({
      ip_address: ip,
      user_agent: userAgent,
      recaptcha_score: null,
      recaptcha_action: action,
      route: req.originalUrl,
      status: "error",
    });
    logSecurity({ platform: "web", operation: "recaptcha", result: "error", reason: "server_error" });
    return { success: false, statusCode: 500, message: "Server error during reCAPTCHA verification." };
  }

  const minScore = config.RECAPTCHA_MIN_SCORE;

  if (
    !recaptchaData.success ||
    (recaptchaData.score !== undefined && recaptchaData.score < minScore)
  ) {
    await recaptchaLogger({
      ip_address: ip,
      user_agent: userAgent,
      recaptcha_score: recaptchaData.score || null,
      recaptcha_action: action,
      route: req.originalUrl,
      status: "fail",
    });
    logSecurity({
      platform: "web",
      operation: "recaptcha",
      result: "block",
      reason: "low_score_or_failed",
      details: { recaptchaScore: recaptchaData.score },
    });
    return { success: false, statusCode: 403, message: "reCAPTCHA verification failed." };
  }

  if (recaptchaData.action !== action) {
    await recaptchaLogger({
      ip_address: ip,
      user_agent: userAgent,
      recaptcha_score: recaptchaData.score || null,
      recaptcha_action: recaptchaData.action || "unknown",
      route: req.originalUrl,
      status: "fail",
    });
    logSecurity({
      platform: "web",
      operation: "recaptcha",
      result: "block",
      reason: "wrong_action",
      details: { recaptchaScore: recaptchaData.score },
    });
    return { success: false, statusCode: 403, message: "Invalid reCAPTCHA action." };
  }

  await recaptchaLogger({
    ip_address: ip,
    user_agent: userAgent,
    recaptcha_score: recaptchaData.score,
    recaptcha_action: action,
    route: req.originalUrl,
    status: "pass",
  });
  logSecurity({ platform: "web", operation: "recaptcha", result: "pass", reason: "ok" });

  return { success: true, skipped: false, score: recaptchaData.score };
}

module.exports = { verifyRecaptcha, _setHttpPostForTest, _setLogRecaptchaForTest };

