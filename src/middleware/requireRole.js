/**
 * Role-Based Access Control (RBAC) middleware factory
 * @param {string[]} allowedRoles Array of roles permitted to access the route
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required before checking role permissions',
      });
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: User with role '${userRole}' is not authorized. Allowed roles: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
}

module.exports = requireRole;
