const twilio = require("twilio");
const { sendSMS } = require("../middlewares/sns.js");
const { enforceRequestSecurity, enforceVerifySecurity } = require("../services/otp/securityFlow.js");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

// Request OTP
exports.requestOtp = async (req, res) => {
  const security = await enforceRequestSecurity(req);

  // Security checks (platform, attestation, rate limits, cooldown) run before
  // any Twilio request.
  if (!security.ok) {
    return res.status(security.statusCode).json({
      status: "error",
      error: security.error,
    });
  }

  try {
    // sendSMS receives the normalized E.164 phone number.
    await sendSMS(security.phone);
    return res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("OTP Error:", error?.message || error);
    return res.status(500).json({
      error: "Failed to send OTP",
    });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  const security = await enforceVerifySecurity(req);

  if (!security.ok) {
    return res.status(security.statusCode).json({
      status: "error",
      error: security.error,
    });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      error: "Phone number and OTP code are required",
    });
  }

  try {
    const verification_check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: security.phone,
        code,
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
    console.error("OTP Verify Error:", error?.message || error);
    return res.status(500).json({
      error: "Failed to verify OTP",
    });
  }
};
