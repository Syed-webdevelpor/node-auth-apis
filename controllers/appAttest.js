const PlayIntegrityService = require("../services/otp/PlayIntegrityService.js");
const AppAttestService = require("../services/otp/AppAttestService.js");
const { normalizePhone } = require("../services/otp/phoneNormalizer.js");
const { validatePlatform } = require("../services/otp/platformValidator.js");

exports.integrityChallenge = async (req, res) => {
  const challenge = PlayIntegrityService.isEnabled()
    ? PlayIntegrityService.generateNonce()
    : null;
  if (!challenge) {
    return res.status(400).json({ status: "error", error: "Play Integrity is not enabled" });
  }
  return res.status(200).json({ nonce: challenge });
};

exports.appAttestChallenge = async (req, res) => {
  if (!AppAttestService.isEnabled()) {
    return res.status(400).json({ status: "error", error: "App Attest is not enabled" });
  }
  if (!AppAttestService.isConfigured()) {
    return res.status(500).json({ status: "error", error: "App Attest is not configured" });
  }
  const challenge = await AppAttestService.generateChallenge();
  return res.status(200).json({ challenge });
};

// Register an App Attest attestation (iOS). Public key is persisted; the
// private key always stays on the device.
exports.register = async (req, res) => {
  if (!AppAttestService.isEnabled()) {
    return res.status(400).json({ status: "error", error: "App Attest is not enabled" });
  }
  if (!AppAttestService.isConfigured()) {
    return res.status(500).json({ status: "error", error: "App Attest is not configured" });
  }

  const platformCheck = validatePlatform(req.body.platform);
  if (!platformCheck.valid || platformCheck.platform !== "ios") {
    return res.status(400).json({ status: "error", error: "Platform must be ios" });
  }

  let phoneNumber = null;
  if (req.body.phoneNumber) {
    const phoneCheck = normalizePhone(req.body.phoneNumber);
    if (!phoneCheck.valid) {
      return res.status(400).json({ status: "error", error: phoneCheck.message });
    }
    phoneNumber = phoneCheck.phone;
  }

  const result = await AppAttestService.register({
    keyId: req.body.keyId,
    attestationObjectB64: req.body.attestationObject,
    clientDataB64: req.body.clientData,
    challenge: req.body.challenge,
    phoneNumber,
    userId: req.body.userId || null,
  });

  if (!result.success) {
    return res.status(result.statusCode).json({ status: "error", error: result.reason });
  }
  return res.status(200).json({ status: "success", keyId: result.keyId });
};