import { verifyAccessToken } from '../config/jwt.js';
import User from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.userId = decoded.userId;

    const user = await User.findById(decoded.userId).select('roles isActive');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account is deactivated.' });
    }
    req.userRoles = user.roles || ['student'];

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Auth failed' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        req.userId = decoded.userId;
        const user = await User.findById(decoded.userId).select('roles');
        if (user) req.userRoles = user.roles || ['student'];
      }
    }
  } catch (error) {
    // Silently continue without auth
  }
  next();
};

export const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userId || !req.userRoles) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const hasRole = req.userRoles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};
