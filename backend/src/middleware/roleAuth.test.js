const { requireRole } = require('./roleAuth');

describe('Role Authorization Middleware - requireRole', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks before each test
    req = {
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('Authorized role scenarios', () => {
    test('should allow access when user has the required role', () => {
      // Set authenticated user with Admin role
      req.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        role: 'Admin'
      };

      // Create middleware that requires Admin role
      const middleware = requireRole('Admin');
      middleware(req, res, next);

      // Verify next() was called
      expect(next).toHaveBeenCalled();

      // Verify no error response
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should allow access when user has one of multiple allowed roles', () => {
      // Set authenticated user with Sales_Agent role
      req.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'agent@example.com',
        role: 'Sales_Agent'
      };

      // Create middleware that allows both Admin and Sales_Agent
      const middleware = requireRole('Admin', 'Sales_Agent');
      middleware(req, res, next);

      // Verify next() was called
      expect(next).toHaveBeenCalled();

      // Verify no error response
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should allow Admin when Admin is one of allowed roles', () => {
      req.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        role: 'Admin'
      };

      const middleware = requireRole('Admin', 'Sales_Agent');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Unauthorized role scenarios', () => {
    test('should reject access when user does not have required role', () => {
      // Set authenticated user with Sales_Agent role
      req.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'agent@example.com',
        role: 'Sales_Agent'
      };

      // Create middleware that requires Admin role only
      const middleware = requireRole('Admin');
      middleware(req, res, next);

      // Verify error response
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Required role: Admin',
        statusCode: 403
      });

      // Verify next() was not called
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject access when user role not in allowed roles list', () => {
      req.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'user@example.com',
        role: 'Guest'
      };

      const middleware = requireRole('Admin', 'Sales_Agent');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Required role: Admin or Sales_Agent',
        statusCode: 403
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Missing authentication scenarios', () => {
    test('should reject request when user is not authenticated', () => {
      // req.user is null (not authenticated)
      const middleware = requireRole('Admin');
      middleware(req, res, next);

      // Verify error response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required. Please login first.',
        statusCode: 401
      });

      // Verify next() was not called
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject request when user object exists but role is missing', () => {
      // User authenticated but role not set
      req.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'user@example.com'
        // role is missing
      };

      const middleware = requireRole('Admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. User role not found.',
        statusCode: 403
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    test('should handle single role requirement', () => {
      req.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        role: 'Admin'
      };

      const middleware = requireRole('Admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should handle multiple role requirements', () => {
      req.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'agent@example.com',
        role: 'Sales_Agent'
      };

      const middleware = requireRole('Admin', 'Sales_Agent', 'Manager');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should be case-sensitive for role matching', () => {
      req.user = {
        userId: '507f1f77bcf86cd799439011',
        email: 'admin@example.com',
        role: 'admin' // lowercase
      };

      const middleware = requireRole('Admin'); // uppercase
      middleware(req, res, next);

      // Should reject because roles don't match (case-sensitive)
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
