const config = require("./config");

/**
 * Validate the client-supplied platform.
 *
 * Allowed values: web, android, ios.
 * Rejects: mobile and any other value.
 *
 * @param {*} platform
 * @returns {{ valid: boolean, platform?: string, message?: string }}
 */
function validatePlatform(platform) {
  if (!config.SUPPORTED_PLATFORMS.includes(platform)) {
    return {
      valid: false,
      message: "Invalid platform. Platform must be web, android, or ios.",
      statusCode: 400,
    };
  }
  return { valid: true, platform };
}

module.exports = { validatePlatform, SUPPORTED_PLATFORMS: config.SUPPORTED_PLATFORMS };