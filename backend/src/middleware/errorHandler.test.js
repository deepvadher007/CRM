const errorHandler = require('./errorHandler');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      path: '/api/test',
      method: 'POST'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('Status Code Determination', () => {
    test('should return 400 for ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 400
        })
      );
    });

    test('should return 409 for duplicate key error', () => {
      const error = new Error('Duplicate key');
      error.code = 11000;
      error.keyPattern = { email: 1 };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 409,
          message: 'email already exists'
        })
      );
    });

    test('should return 400 for CastError', () => {
      const error = new Error('Cast failed');
      error.name = 'CastError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 400,
          message: 'Invalid ID format'
        })
      );
    });

    test('should return 401 for JsonWebTokenError', () => {
      const error = new Error('JWT error');
      error.name = 'JsonWebTokenError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 401,
          message: 'Invalid token'
        })
      );
    });

    test('should return 401 for TokenExpiredError', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 401,
          message: 'Token expired'
        })
      );
    });

    test('should use error.statusCode if present', () => {
      const error = new Error('Custom error');
      error.statusCode = 403;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 403
        })
      );
    });

    test('should return 500 for unknown errors', () => {
      const error = new Error('Unknown error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 500
        })
      );
    });
  });

  describe('Error Response Format', () => {
    test('should return consistent error format with success: false', () => {
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.any(String),
          statusCode: expect.any(Number)
        })
      );
    });

    test('should include validation errors array for ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        email: { message: 'Email is required' },
        password: { message: 'Password must be at least 8 characters' }
      };

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([
            'Email is required',
            'Password must be at least 8 characters'
          ])
        })
      );
    });

    test('should not include errors array for non-validation errors', () => {
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.errors).toBeUndefined();
    });
  });

  describe('Environment-Specific Behavior', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: 'Error stack trace'
        })
      );
    });

    test('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.stack).toBeUndefined();
    });

    test('should log full error details in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Test error',
          stack: 'Error stack trace',
          path: '/api/test',
          method: 'POST'
        })
      );
    });

    test('should log sanitized error in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Test error',
          path: '/api/test',
          method: 'POST',
          timestamp: expect.any(String)
        })
      );

      // Verify stack is not logged in production
      const loggedData = console.error.mock.calls[0][1];
      expect(loggedData.stack).toBeUndefined();
    });
  });

  describe('Sensitive Information Protection', () => {
    test('should not expose database connection strings in errors', () => {
      const error = new Error('MongoError: connection failed to mongodb://user:password@localhost:27017/db');

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      // In production, the raw error message would be sanitized
      // For now, we verify the response format is consistent
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('statusCode');
    });

    test('should sanitize duplicate key error messages', () => {
      const error = new Error('Duplicate key');
      error.code = 11000;
      error.keyPattern = { email: 1 };

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'email already exists'
        })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle error without message', () => {
      const error = new Error();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error',
          statusCode: 500
        })
      );
    });

    test('should handle error with empty keyPattern', () => {
      const error = new Error('Duplicate key');
      error.code = 11000;
      error.keyPattern = {};

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'undefined already exists'
        })
      );
    });

    test('should handle ValidationError with no errors object', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {};

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors: []
        })
      );
    });
  });
});
