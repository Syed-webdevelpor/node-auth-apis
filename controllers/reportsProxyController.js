const axios = require('axios');
const DB = require('../dbConnection.js');

const TRADING_SERVER_URL = process.env.TRADING_SERVER_URL;

if (!TRADING_SERVER_URL) {
  // Fail fast so misconfiguration is obvious.
  // (keep module load safe for tests)
  console.warn('[reportsProxyController] TRADING_SERVER_URL is not set');
}

async function getTradingSessionByUserId(userId) {
  const [rows] = await DB.execute(
    `SELECT user_id, trading_user_id, trading_access_token, trading_refresh_token, expires_at
     FROM trading_sessions
     WHERE user_id = ?
     AND (is_active IS NULL OR is_active = 1)
     ORDER BY id DESC
     LIMIT 1`,
    [userId]
  );
  return rows && rows.length ? rows[0] : null;
}

function getCallerUserIdFromJwt(req) {
  // tokenValidation() only puts header into req.headers.access_token.
  const { verifyToken } = require('../tokenHandler');
  const data = verifyToken(req.headers.access_token, true);
  if (data && data.status) return { error: data };
  return { userId: data?.id?.toString() };
}


async function updateTradingSessionTokens({ userId, tradingAccessToken, tradingRefreshToken, expiresAt }) {
  await DB.execute(
    `UPDATE trading_sessions
     SET trading_access_token = ?,
         trading_refresh_token = ?,
         expires_at = ?,
         updated_at = NOW()
     WHERE user_id = ?`,
    [tradingAccessToken, tradingRefreshToken, expiresAt, userId]
  );
}

async function refreshTradingToken({ tradingRefreshToken }) {
  // Trading server contract (per user request):
  // POST /auth/refresh
  // Body: { refreshToken: "..." }
  const url = `${TRADING_SERVER_URL}/auth/refresh`;
  const r = await axios.post(
    url,
    { refreshToken: tradingRefreshToken },
    { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
  );

  return {
    tradingAccessToken: r?.data?.access_token ?? r?.data?.accessToken ?? r?.data?.token,
    tradingRefreshToken: r?.data?.refresh_token ?? r?.data?.refreshToken,
    // best-effort: if trading server doesn't return expiresAt, fall back to +7 days like login does
    expiresAt: r?.data?.expires_at ?? r?.data?.expiresAt ?? null,
    raw: r.data,
  };
}

function buildTradingReportPath(reportKind, opts = {}) {
  // Matches requested basePath: TRADING_SERVER_URL + /trading/reports
  // All endpoints live under: /trading/reports/trader/:userId/...
  const { userId } = opts;

  switch (reportKind) {
    case 'account-summary':
      return `/trading/reports/trader/${encodeURIComponent(userId)}/account-summary`;

    case 'account-summary-export':
      return `/trading/reports/trader/${encodeURIComponent(userId)}/account-summary/export`;

    case 'deposits-export':
      return `/trading/reports/trader/${encodeURIComponent(userId)}/deposits/export`;

    case 'withdrawals-export':
      return `/trading/reports/trader/${encodeURIComponent(userId)}/withdrawals/export`;

    case 'internal-transfers-export':
      return `/trading/reports/trader/${encodeURIComponent(userId)}/internal-transfers/export`;

    case 'trade-history-export':
      return `/trading/reports/trader/${encodeURIComponent(userId)}/trade-history/export`;

    case 'open-positions-export':
      return `/trading/reports/trader/${encodeURIComponent(userId)}/open-positions/export`;

    case 'pending-orders-export':
      return `/trading/reports/trader/${encodeURIComponent(userId)}/pending-orders/export`;

    case 'performance-analytics-export':
      return `/trading/reports/trader/${encodeURIComponent(userId)}/performance-analytics/export`;

    case 'statement-export':
      return `/trading/reports/trader/${encodeURIComponent(userId)}/statement/export`;

    case 'total-trades-pnl':
      return `/trading/reports/trader/${encodeURIComponent(userId)}/total-trades-pnl`;

    default:
      throw new Error(`Unknown reportKind: ${reportKind}`);
  }
}

async function proxyGetReport(req, res) {
  try {
    const userIdParam = req.params.userId;

    // External server authenticated to *this* API via JWT.
    // We enforce that authenticated user matches :userId based on the existing requirement.
    // Current codebase doesn't have a unified req.user; tokenValidation in this repo only extracts header token.
    // So we infer authenticated user id by verifying JWT access token.
    const { verifyToken } = require('../tokenHandler');
    const data = verifyToken(req.headers.access_token, true);
    if (data && data.status) return res.status(data.status).json(data);

    const callerUserId = data?.id;
    if (callerUserId && callerUserId.toString() !== userIdParam.toString()) {
      return res.status(403).json({ status: 403, message: 'Forbidden' });
    }

    const session = await getTradingSessionByUserId(userIdParam);
    if (!session || !session.trading_access_token) {
      return res.status(401).json({
        status: 401,
        message: 'Missing trading session or access token',
      });
    }

    const reportKind = req.params.reportKind;

    // Important change:
    // trading endpoints must use trading_user_id from trading_sessions,
    // NOT the :userId param value.
    const tradingUserId = session.trading_user_id;
    if (!tradingUserId) {
      return res.status(401).json({
        status: 401,
        message: 'Missing trading_user_id in trading session',
      });
    }

    const tradingPath = buildTradingReportPath(reportKind, { userId: tradingUserId });

    const fullUrl = `${TRADING_SERVER_URL}${tradingPath}`;

    const doRequest = async (accessToken) => {
      const query = { ...req.query };
      // pass through filters (startDate/endDate/symbol/page/limit + export format)
      const r = await axios.get(fullUrl, {
        params: query,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        timeout: 30000,
        validateStatus: () => true,
      });
      return r;
    };

    let r = await doRequest(session.trading_access_token);

    // If expired/unauthorized, refresh and retry once
    if (r.status === 401 || r.status === 403) {
      if (!session.trading_refresh_token) {
        return res.status(r.status).json({
          status: r.status,
          message: 'Trading token expired and no refresh token available',
          details: r.data,
        });
      }

      const refreshed = await refreshTradingToken({
        tradingRefreshToken: session.trading_refresh_token,
      });

      // compute expiresAt if trading server didn't return it
      const expiresAt = refreshed.expiresAt
        ? new Date(refreshed.expiresAt)
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() + 7);
            return d;
          })();

      await updateTradingSessionTokens({
        userId: userIdParam,
        tradingAccessToken: refreshed.tradingAccessToken,
        tradingRefreshToken: refreshed.tradingRefreshToken || session.trading_refresh_token,
        expiresAt,
      });

      r = await doRequest(refreshed.tradingAccessToken);
    }

    if (r.status < 200 || r.status >= 300) {
      return res.status(r.status).json({
        status: r.status,
        message: 'Failed to fetch trading report',
        details: r.data,
      });
    }

    return res.status(r.status).json(r.data);
  } catch (err) {
    console.error('[proxyGetReport] error:', err.message);
    return res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
      error: err.message,
    });
  }
}

module.exports = {
  proxyGetReport,
};

