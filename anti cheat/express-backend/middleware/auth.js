/**
 * JWT auth middleware for the anti-cheat backend.
 * Reads the same JWT_ACCESS_SECRET as the main e-learning backend
 * so tokens issued by the main app are valid here.
 */

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      console.error('JWT_ACCESS_SECRET not set in .env');
      return res.status(500).json({ error: 'Server misconfigured' });
    }
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.userId || decoded.id || decoded.sub;
    if (!req.userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
