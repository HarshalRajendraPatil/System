const { AUTH_COOKIE } = require('../constants/auth');
const { verifyAccessToken } = require('../utils/authTokens');
const { createHttpError } = require('../utils/httpError');

const readBearerToken = (authHeader = '') => {
  if (!authHeader || typeof authHeader !== 'string') {
    return '';
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') {
    return '';
  }

  return token || '';
};

const authenticateRequest = (req, res, next) => {
  try {
    const cookieToken = req.cookies?.[AUTH_COOKIE.ACCESS_TOKEN] || '';
    const bearerToken = readBearerToken(req.headers.authorization);
    const token = cookieToken || bearerToken;

    if (!token) {
      return next(createHttpError(401, 'Authentication required'));
    }

    const decoded = verifyAccessToken(token);
    req.user = {
      userId: decoded.sub,
      role: decoded.role,
      username: decoded.username,
    };

    return next();
  } catch {
    return next(createHttpError(401, 'Invalid or expired session. Please log in again.'));
  }
};

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(createHttpError(401, 'Authentication required'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(createHttpError(403, 'You are not authorized to perform this action'));
  }

  return next();
};

module.exports = {
  authenticateRequest,
  authorizeRoles,
};
