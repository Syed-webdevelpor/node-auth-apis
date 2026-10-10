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

function defaultTradingExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

async function upsertTradingSession({ userId, tradingUserId, tradingAccessToken, tradingRefreshToken, expiresAt }) {
  const [existing] = await DB.execute(
    `SELECT id FROM trading_sessions WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  if (existing.length > 0) {
    await DB.execute(
      `UPDATE trading_sessions
       SET trading_user_id = ?,
           trading_access_token = ?,
           trading_refresh_token = ?,
           expires_at = ?,
           is_active = 1,
           updated_at = NOW()
       WHERE user_id = ?`,
      [tradingUserId, tradingAccessToken, tradingRefreshToken, expiresAt, userId]
    );
  } else {
    await DB.execute(
      `INSERT INTO trading_sessions
       (user_id, trading_user_id, trading_access_token, trading_refresh_token, expires_at, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [userId, tradingUserId, tradingAccessToken, tradingRefreshToken, expiresAt]
    );
  }
}

async function tradingReLogin({ email, password }) {
  // Mirrors the login flow in user.js / biometric.js:
  // POST /auth/login with the stored email + password.
  const url = `${TRADING_SERVER_URL}/auth/login`;
  const resp = await axios.post(
    url,
    { email, password },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
      },
      timeout: 30000,
      validateStatus: () => true,
    }
  );

  if (resp.status < 200 || resp.status >= 300) return null;

  const d = resp.data || {};
  const tradingAccessToken = d.access_token ?? d.accessToken ?? d.token ?? null;
  if (!tradingAccessToken) return null;

  return {
    tradingAccessToken,
    tradingRefreshToken: d.refresh_token ?? d.refreshToken ?? null,
    tradingUserId: d.user?.id ?? null,
    expiresAt: d.expires_at ?? d.expiresAt ?? null,
  };
}

// Re-establishes a valid trading session entirely on the server so the
// client never has to deal with an expired/invalid trading token.
// 1) try /auth/refresh, 2) fall back to re-login via stored credentials.
async function recoverTradingSession(userId, session) {
  // 1) Try to refresh using the stored refresh token.
  if (session.trading_refresh_token) {
    try {
      const refreshed = await refreshTradingToken({
        tradingRefreshToken: session.trading_refresh_token,
      });
      if (refreshed.tradingAccessToken) {
        const expiresAt = refreshed.expiresAt
          ? new Date(refreshed.expiresAt)
          : defaultTradingExpiry();
        await updateTradingSessionTokens({
          userId,
          tradingAccessToken: refreshed.tradingAccessToken,
          tradingRefreshToken: refreshed.tradingRefreshToken || session.trading_refresh_token,
          expiresAt,
        });
        return { tradingAccessToken: refreshed.tradingAccessToken };
      }
    } catch (err) {
      console.error(
        '[proxyGetReport] token refresh failed, falling back to re-login:',
        err?.response?.data || err.message
      );
    }
  }

  // 2) Fall back to re-login using the user's stored credentials so the
  //    session is re-established on the server without bothering the client.
  try {
    const [rows] = await DB.execute(
      `SELECT email, password FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (!rows.length) return null;

    const relogin = await tradingReLogin({
      email: rows[0].email,
      password: rows[0].password,
    });
    if (!relogin) return null;

    const expiresAt = relogin.expiresAt ? new Date(relogin.expiresAt) : defaultTradingExpiry();
    await upsertTradingSession({
      userId,
      tradingUserId: relogin.tradingUserId || session.trading_user_id,
      tradingAccessToken: relogin.tradingAccessToken,
      tradingRefreshToken: relogin.tradingRefreshToken || session.trading_refresh_token,
      expiresAt,
    });
    return { tradingAccessToken: relogin.tradingAccessToken };
  } catch (err) {
    console.error(
      '[proxyGetReport] trading re-login failed:',
      err?.response?.data || err.message
    );
    return null;
  }
}

function buildTradingReportPath(reportKind, opts = {}) {
  // Matches requested basePath: TRADING_SERVER_URL + /trading/reports
  // All endpoints live under: /reports/trader/:userId/...
  const { userId } = opts;

  switch (reportKind) {
    case 'account-summary':
      return `/reports/trader/${encodeURIComponent(userId)}/account-summary`;

    case 'account-summary-export':
      return `/reports/trader/${encodeURIComponent(userId)}/account-summary/export`;

    case 'open-positions-export':
      return `/reports/trader/${encodeURIComponent(userId)}/open-positions/export`;

    case 'statement-export':
      return `/reports/trader/${encodeURIComponent(userId)}/statement/export`;

    default:
      throw new Error(`Unknown reportKind: ${reportKind}`);
  }
}

async function proxyGetReport(req, res) {
  try {

    // External server authenticated to *this* API via JWT.
    // We enforce that authenticated user matches :userId based on the existing requirement.
    // Current codebase doesn't have a unified req.user; tokenValidation in this repo only extracts header token.
    // So we infer authenticated user id by verifying JWT access token.
    const { verifyToken } = require('../tokenHandler');
    const data = verifyToken(req.headers.access_token, true);
    if (data && data.status) return res.status(data.status).json(data);

    const callerUserId = data?.id;
    const session = await getTradingSessionByUserId(callerUserId);
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

    // If the trading server rejects the token (expired/unauthorized), recover
    // the session entirely on the server (refresh, then re-login fallback) and
    // retry once. The client never sees the trading 401/403.
    if (r.status === 401 || r.status === 403) {
      const recovered = await recoverTradingSession(callerUserId, session);

      if (!recovered || !recovered.tradingAccessToken) {
        // We genuinely could not re-establish a trading session. Do not leak the
        // raw trading 401/403 to the client; log server-side and return a clean,
        // actionable error instead.
        console.error(
          '[proxyGetReport] unable to recover trading session for user:',
          callerUserId,
          '| trading server responded with status:',
          r.status
        );
        return res.status(503).json({
          status: 503,
          message: 'Trading session could not be re-established. Please try again or re-link your trading account.',
          details: r.data,
        });
      }

      r = await doRequest(recovered.tradingAccessToken);
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

