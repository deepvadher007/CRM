const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token and authenticate requests
 * Extracts token from Authorization header, verifies it, and attaches user data to request
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyToken = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        statusCode: 401
      });
    }

    // Check if token follows Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format. Expected "Bearer <token>"',
        statusCode: 401
      });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.substring(7);

    // Check if token is empty
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        statusCode: 401
      });
    }

    // Verify token using JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user data to request object
    req.user = {
      userId: decoded.userId,
      phone: decoded.phone,
      role: decoded.role
    };

    // Continue to next middleware
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
        statusCode: 401
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Authentication failed.',
        statusCode: 401
      });
    }

    // Handle other errors
    return res.status(401).json({
      success: false,
      message: 'Authentication failed.',
      statusCode: 401
    });
  }
};

module.exports = { verifyToken };
