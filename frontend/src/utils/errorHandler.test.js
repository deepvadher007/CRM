import {
  extractErrorMessage,
  extractValidationErrors,
  formatError,
  isAuthError,
  isForbiddenError,
  isValidationError,
  getStatusMessage,
} from './errorHandler';

describe('errorHandler utilities', () => {
  describe('extractErrorMessage', () => {
    it('should extract message from error response data', () => {
      const error = {
        response: {
          data: {
            message: 'Invalid credentials',
          },
        },
      };
      
      expect(extractErrorMessage(error)).toBe('Invalid credentials');
    });

    it('should extract and join validation errors array', () => {
      const error = {
        response: {
          data: {
            errors: ['Email is required', 'Password is too short'],
          },
        },
      };
      
      expect(extractErrorMessage(error)).toBe('Email is required, Password is too short');
    });

    it('should return default message when no error details available', () => {
      const error = {};
      
      expect(extractErrorMessage(error, 'Default error')).toBe('Default error');
    });

    it('should handle network errors', () => {
      const error = {
        message: 'Network Error',
      };
      
      expect(extractErrorMessage(error)).toBe('Network error. Please check your connection.');
    });

    it('should handle timeout errors', () => {
      const error = {
        code: 'ECONNABORTED',
      };
      
      expect(extractErrorMessage(error)).toBe('Request timeout. Please try again.');
    });

    it('should return error message if available', () => {
      const error = {
        message: 'Something went wrong',
      };
      
      expect(extractErrorMessage(error)).toBe('Something went wrong');
    });
  });

  describe('extractValidationErrors', () => {
    it('should extract validation errors from array', () => {
      const error = {
        response: {
          data: {
            errors: ['Error 1', 'Error 2'],
          },
        },
      };
      
      const result = extractValidationErrors(error);
      expect(result.error_0).toBe('Error 1');
      expect(result.error_1).toBe('Error 2');
    });

    it('should return empty object when no validation errors', () => {
      const error = {
        response: {
          data: {},
        },
      };
      
      expect(extractValidationErrors(error)).toEqual({});
    });

    it('should handle missing response', () => {
      const error = {};
      
      expect(extractValidationErrors(error)).toEqual({});
    });
  });

  describe('formatError', () => {
    it('should format error with all details', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: 'Validation failed',
            errors: ['Field error'],
          },
        },
      };
      
      const result = formatError(error);
      expect(result.message).toBe('Validation failed');
      expect(result.statusCode).toBe(400);
      expect(result.validationErrors).toHaveProperty('error_0');
    });

    it('should handle error without response', () => {
      const error = {
        message: 'Network Error',
      };
      
      const result = formatError(error);
      expect(result.message).toBe('Network error. Please check your connection.');
      expect(result.statusCode).toBeUndefined();
    });
  });

  describe('isAuthError', () => {
    it('should return true for 401 status', () => {
      const error = {
        response: {
          status: 401,
        },
      };
      
      expect(isAuthError(error)).toBe(true);
    });

    it('should return false for non-401 status', () => {
      const error = {
        response: {
          status: 400,
        },
      };
      
      expect(isAuthError(error)).toBe(false);
    });

    it('should return false when no response', () => {
      const error = {};
      
      expect(isAuthError(error)).toBe(false);
    });
  });

  describe('isForbiddenError', () => {
    it('should return true for 403 status', () => {
      const error = {
        response: {
          status: 403,
        },
      };
      
      expect(isForbiddenError(error)).toBe(true);
    });

    it('should return false for non-403 status', () => {
      const error = {
        response: {
          status: 401,
        },
      };
      
      expect(isForbiddenError(error)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for 400 status', () => {
      const error = {
        response: {
          status: 400,
        },
      };
      
      expect(isValidationError(error)).toBe(true);
    });

    it('should return false for non-400 status', () => {
      const error = {
        response: {
          status: 500,
        },
      };
      
      expect(isValidationError(error)).toBe(false);
    });
  });

  describe('getStatusMessage', () => {
    it('should return correct message for 400', () => {
      expect(getStatusMessage(400)).toBe('Invalid request. Please check your input.');
    });

    it('should return correct message for 401', () => {
      expect(getStatusMessage(401)).toBe('Authentication required. Please login.');
    });

    it('should return correct message for 403', () => {
      expect(getStatusMessage(403)).toBe('Access denied. You do not have permission.');
    });

    it('should return correct message for 404', () => {
      expect(getStatusMessage(404)).toBe('Resource not found.');
    });

    it('should return correct message for 409', () => {
      expect(getStatusMessage(409)).toBe('Conflict. Resource already exists.');
    });

    it('should return correct message for 500', () => {
      expect(getStatusMessage(500)).toBe('Server error. Please try again later.');
    });

    it('should return default message for unknown status', () => {
      expect(getStatusMessage(999)).toBe('An unexpected error occurred.');
    });
  });
});
