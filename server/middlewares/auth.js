import jwt from 'jsonwebtoken';

/**
 * Returns JWT secret with strict security enforcement for production.
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[Security Exception]: JWT_SECRET must be defined in production environment.');
    }
    return 'local_development_jwt_secret_key_1234567890';
  }
  return secret;
};

/**
 * Authentication middleware to validate JWTs in Request Headers.
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

/**
 * Optional authentication middleware: attaches req.user if a valid Bearer token is present,
 * otherwise continues without failing so public endpoints can return masked vs full views.
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, getJwtSecret());
    } catch {
      req.user = null;
    }
  }
  next();
};
