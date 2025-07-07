const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

exports.sendSMS = async (phoneNumber) => {
  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });
    return verification;
  } catch (error) {
    console.error("Twilio Verify Error:", error);
    throw error;
  }
};
