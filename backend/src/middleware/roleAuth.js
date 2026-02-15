/**
 * Role-based authorization middleware
 * Checks if authenticated user has required role to access a route
 * Must be used after verifyToken middleware
 */

/**
 * Creates middleware to check if user has one of the allowed roles
 * 
 * @param {...string} allowedRoles - One or more roles that are allowed to access the route
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Single role
 * router.get('/admin', verifyToken, requireRole('Admin'), adminController);
 * 
 * @example
 * // Multiple roles
 * router.get('/dashboard', verifyToken, requireRole('Admin', 'Sales_Agent'), dashboardController);
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated (should be set by verifyToken middleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please login first.',
          statusCode: 401
        });
      }

      // Check if user has a role
      if (!req.user.role) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. User role not found.',
          statusCode: 403
        });
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          statusCode: 403
        });
      }

      // User has required role, continue to next middleware
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed.',
        statusCode: 500
      });
    }
  };
};

module.exports = { requireRole };
