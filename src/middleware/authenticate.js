const { verifyToken } = require('../utils/auth');

/**
 * Authentication middleware
 * Reads Authorization: Bearer <token>, verifies JWT, attaches decoded payload to req.user, else 401
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or malformed Bearer token in Authorization header',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: No token provided',
      });
    }

    const decoded = verifyToken(token);
    req.user = decoded; // { personnelId, name, role, email, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: `Unauthorized: ${err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'}`,
    });
  }
}

module.exports = authenticate;
