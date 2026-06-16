module.exports = function requireHttps(req, res, next) {
  // If running behind a proxy/load balancer, trust proxy should be configured.
  // We rely on x-forwarded-proto (common) plus req.secure.
  const proto = req.headers['x-forwarded-proto'];
  const isHttps = req.secure || proto === 'https';

  if (process.env.NODE_ENV === 'production' && !isHttps) {
    return res.status(426).json({
      success: false,
      message: 'HTTPS is required',
    });
  }

  return next();
};

