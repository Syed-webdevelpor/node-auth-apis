module.exports = (req, res, next) => {
  const apiKey = req.header('x-api-key'); // API key passed in request header

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is missing' });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next(); // API key is valid, proceed to next middleware or route
};
