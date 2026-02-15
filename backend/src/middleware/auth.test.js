const jwt = require('jsonwebtoken');
const { verifyToken } = require('./auth');

// Mock environment variable
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';

describe('Authentication Middleware - verifyToken', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks before each test
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('Valid token scenarios', () => {
    test('should accept valid JWT token and attach user data to request', () => {
      // Generate a valid token
      const payload = {
        userId: '507f1f77bcf86cd799439011',
        phone: '9876543210',
        role: 'Admin'
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });

      // Set Authorization header
      req.headers.authorization = `Bearer ${token}`;

      // Call middleware
      verifyToken(req, res, next);

      // Verify user data attached to request
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(payload.userId);
      expect(req.user.phone).toBe(payload.phone);
      expect(req.user.role).toBe(payload.role);

      // Verify next() was called
      expect(next).toHaveBeenCalled();

      // Verify no error response
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('Missing token scenarios', () => {
    test('should reject request with missing Authorization header', () => {
      // No Authorization header set
      verifyToken(req, res, next);

      // Verify error response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. No token provided.',
        statusCode: 401
      });

      // Verify next() was not called
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject request with empty Authorization header', () => {
      req.headers.authorization = '';

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. No token provided.',
        statusCode: 401
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject request with Bearer but no token', () => {
      req.headers.authorization = 'Bearer ';

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. No token provided.',
        statusCode: 401
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Invalid token format scenarios', () => {
    test('should reject token without Bearer prefix', () => {
      const payload = { userId: '123', phone: '9876543210', role: 'Admin' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);

      req.headers.authorization = token; // Missing "Bearer " prefix

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token format. Expected "Bearer <token>"',
        statusCode: 401
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject malformed token', () => {
      req.headers.authorization = 'Bearer invalid-token-string';

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token. Authentication failed.',
        statusCode: 401
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Expired token scenarios', () => {
    test('should reject expired JWT token', () => {
      // Generate an expired token (expired 1 hour ago)
      const payload = {
        userId: '507f1f77bcf86cd799439011',
        phone: '9876543210',
        role: 'Admin'
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1h' });

      req.headers.authorization = `Bearer ${token}`;

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token has expired. Please login again.',
        statusCode: 401
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Invalid signature scenarios', () => {
    test('should reject token signed with different secret', () => {
      const payload = {
        userId: '507f1f77bcf86cd799439011',
        phone: '9876543210',
        role: 'Admin'
      };
      const token = jwt.sign(payload, 'different-secret-key');

      req.headers.authorization = `Bearer ${token}`;

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token. Authentication failed.',
        statusCode: 401
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
