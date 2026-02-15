/**
 * Global Error Handler Middleware
 * Catches all errors from routes and controllers, formats consistent responses
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

/**
 * Determines the appropriate HTTP status code based on error type
 * @param {Error} error - The error object
 * @returns {number} HTTP status code
 */
const getStatusCode = (error) => {
  // If error already has a statusCode, use it
  if (error.statusCode) {
    return error.statusCode;
  }

  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    return 400;
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    return 409;
  }

  // Mongoose cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return 400;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return 401;
  }

  if (error.name === 'TokenExpiredError') {
    return 401;
  }

  // Default to 500 for unknown errors
  return 500;
};

/**
 * Formats error message based on error type
 * @param {Error} error - The error object
 * @returns {string} Formatted error message
 */
const getErrorMessage = (error) => {
  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return `${field} already exists`;
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    return 'Validation failed';
  }

  // Mongoose cast error
  if (error.name === 'CastError') {
    return 'Invalid ID format';
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    return 'Token expired';
  }

  // Use error message if available
  return error.message || 'Internal server error';
};

/**
 * Extracts detailed validation errors from Mongoose ValidationError
 * @param {Error} error - The error object
 * @returns {Array<string>} Array of validation error messages
 */
const getValidationErrors = (error) => {
  if (error.name === 'ValidationError' && error.errors) {
    return Object.values(error.errors).map(err => err.message);
  }
  return undefined;
};

/**
 * Global error handler middleware
 * Formats consistent error responses and logs errors appropriately
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // Determine status code
  const statusCode = getStatusCode(err);

  // Get error message
  const message = getErrorMessage(err);

  // Get validation errors if applicable
  const errors = getValidationErrors(err);

  // Log error with appropriate detail
  if (process.env.NODE_ENV === 'development') {
    // Full stack trace in development
    console.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      path: req.path,
      method: req.method
    });
  } else {
    // Sanitized logging in production (no stack traces)
    console.error('Error occurred:', {
      message: message,
      statusCode,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Format consistent error response
  const errorResponse = {
    success: false,
    message,
    statusCode
  };

  // Add validation errors if present
  if (errors) {
    errorResponse.errors = errors;
  }

  // In development, include stack trace for debugging
  // Never expose sensitive information in production
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
