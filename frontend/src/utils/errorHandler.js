/**
 * Error handling utilities for extracting and formatting error messages from API responses
 */

/**
 * Extract error message from API error response
 * @param {Error} error - The error object from axios or other sources
 * @param {string} defaultMessage - Default message if no specific error is found
 * @returns {string} - Formatted error message
 */
export const extractErrorMessage = (error, defaultMessage = 'An error occurred') => {
  // Check if error response exists
  if (error.response) {
    // Extract message from response data
    const { data } = error.response;
    
    // Return the message if it exists
    if (data?.message) {
      return data.message;
    }
    
    // Handle validation errors array
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      // Join multiple validation errors
      return data.errors.join(', ');
    }
  }
  
  // Check for network errors
  if (error.message === 'Network Error') {
    return 'Network error. Please check your connection.';
  }
  
  // Check for timeout errors
  if (error.code === 'ECONNABORTED') {
    return 'Request timeout. Please try again.';
  }
  
  // Return error message if available
  if (error.message) {
    return error.message;
  }
  
  // Return default message
  return defaultMessage;
};

/**
 * Extract validation errors from API response
 * @param {Error} error - The error object from axios
 * @returns {Object} - Object with field names as keys and error messages as values
 */
export const extractValidationErrors = (error) => {
  const validationErrors = {};
  
  if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
    // If errors is an array of strings, return as general errors
    error.response.data.errors.forEach((err, index) => {
      validationErrors[`error_${index}`] = err;
    });
  }
  
  return validationErrors;
};

/**
 * Format error for display
 * @param {Error} error - The error object
 * @returns {Object} - Formatted error object with message and details
 */
export const formatError = (error) => {
  return {
    message: extractErrorMessage(error),
    statusCode: error.response?.status,
    validationErrors: extractValidationErrors(error),
  };
};

/**
 * Check if error is authentication related
 * @param {Error} error - The error object
 * @returns {boolean} - True if error is 401 Unauthorized
 */
export const isAuthError = (error) => {
  return error.response?.status === 401;
};

/**
 * Check if error is authorization related
 * @param {Error} error - The error object
 * @returns {boolean} - True if error is 403 Forbidden
 */
export const isForbiddenError = (error) => {
  return error.response?.status === 403;
};

/**
 * Check if error is validation related
 * @param {Error} error - The error object
 * @returns {boolean} - True if error is 400 Bad Request
 */
export const isValidationError = (error) => {
  return error.response?.status === 400;
};

/**
 * Get user-friendly error message based on status code
 * @param {number} statusCode - HTTP status code
 * @returns {string} - User-friendly error message
 */
export const getStatusMessage = (statusCode) => {
  const statusMessages = {
    400: 'Invalid request. Please check your input.',
    401: 'Authentication required. Please login.',
    403: 'Access denied. You do not have permission.',
    404: 'Resource not found.',
    409: 'Conflict. Resource already exists.',
    500: 'Server error. Please try again later.',
    502: 'Bad gateway. Service temporarily unavailable.',
    503: 'Service unavailable. Please try again later.',
  };
  
  return statusMessages[statusCode] || 'An unexpected error occurred.';
};
