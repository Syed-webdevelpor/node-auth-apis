const axios = require("axios");

const TRADING_SERVER_URL = process.env.TRADING_SERVER_URL;

// Standard UUID (any version) used for path param validation.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Outbound request timeout to the trading server.
const TRADING_TIMEOUT_MS = parseInt(
  process.env.INTERNAL_POSITIONS_TIMEOUT_MS || "15000",
  10
);

/**
 * Portal Backend client for the Trading Server internal endpoint:
 *   GET /internal/positions/account/:accountId   (x-internal-api-key)
 *
 * Authenticated portal users hit this route; we then call the trading server
 * service-to-service using the shared secret. The trading server is the source
 * of truth for open positions, live price, unrealized P&L and market value.
 */
const getOpenPositionsByAccount = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    // 1) Validate the account id is a UUID.
    if (!accountId || !UUID_REGEX.test(accountId)) {
      return res.status(400).json({
        status: 400,
        message: "accountId must be a valid UUID",
      });
    }

    // 2) Fail closed if we have no shared secret to authenticate ourselves.
    if (!process.env.INTERNAL_API_KEY) {
      return res.status(503).json({
        status: 503,
        message: "INTERNAL_API_KEY is not configured on the server",
      });
    }

    if (!TRADING_SERVER_URL) {
      return res.status(503).json({
        status: 503,
        message: "TRADING_SERVER_URL is not configured on the server",
      });
    }

    const url = `${TRADING_SERVER_URL.replace(
      /\/$/,
      ""
    )}/internal/positions/account/${accountId}`;

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": process.env.INTERNAL_API_KEY,
      },
      timeout: TRADING_TIMEOUT_MS,
      // We handle non-2xx ourselves so we can forward meaningful statuses.
      validateStatus: () => true,
    });

    const { status, data } = response;

    // Success: { account_id, count, positions: [...] }
    if (status >= 200 && status < 300) {
      return res.status(200).json({
        status: 200,
        account_id: data.account_id,
        count: data.count,
        positions: data.positions || [],
      });
    }

    // Forward trading-server statuses that are meaningful to the caller:
    //   401 -> invalid/missing internal key on the trading server
    //   404 -> trading account not found (NOT "no open positions")
    //   429 -> trading server rate limit hit
    if (status === 401 || status === 404 || status === 429) {
      return res.status(status).json({
        status,
        message:
          (data && data.message) ||
          (status === 404
            ? "Trading account not found"
            : "Failed to fetch open positions from trading server"),
      });
    }

    // Anything else -> bad gateway (trading server misbehaving).
    return res.status(502).json({
      status: 502,
      message: "Failed to fetch open positions from trading server",
      details: data,
    });
  } catch (err) {
    // Timeouts / network errors from reaching the trading server.
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return res.status(504).json({
        status: 504,
        message: "Trading server timed out while fetching open positions",
      });
    }
    console.error(
      "[getOpenPositionsByAccount] error:",
      err.message
    );
    next(err);
  }
};

module.exports = {
  getOpenPositionsByAccount,
};
