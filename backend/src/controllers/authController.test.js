const { register, login, getProfile } = require('./authController');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../models/User');
jest.mock('express-validator');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

// Mock environment variable
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';

describe('AuthController - register', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {
        name: 'John Doe',
        phone: { countryCode: '+91', number: '9876543210' },
        password: 'password123',
        role: 'Admin'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  describe('Successful registration', () => {
    it('should create a new user and return 201 with user data (excluding password)', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      User.findOne.mockResolvedValue(null);

      const mockUser = {
        _id: 'user123',
        name: 'John Doe',
        email: undefined,
        role: 'Admin',
        phone: { countryCode: '+91', number: '9876543210' },
        createdAt: new Date()
      };
      User.create = jest.fn().mockResolvedValue(mockUser);

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('User registered successfully');
      expect(responseData.user.password).toBeUndefined();
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when validation fails', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'Phone is required' },
          { msg: 'Password must be at least 8 characters long' }
        ]
      });

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          'Phone is required',
          'Password must be at least 8 characters long'
        ]
      });

      expect(User.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate email', () => {
    it('should return 409 when user with email already exists', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      req.body.email = 'john@example.com';

      User.findOne.mockResolvedValue({
        _id: 'existing123',
        email: 'john@example.com'
      });

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.message).toContain('already exists');
    });
  });

  describe('Error handling', () => {
    it('should pass errors to error handler middleware', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const mockError = new Error('Database connection failed');
      User.findOne.mockRejectedValue(mockError);

      await register(req, res, next);

      expect(next).toHaveBeenCalledWith(mockError);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});

describe('AuthController - login', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {
        identifier: '9876543210',
        password: 'password123'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  describe('Successful login', () => {
    it('should authenticate user and return 200 with token and user data (excluding password)', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const mockUser = {
        _id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin',
        password: 'hashedpassword'
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      bcrypt.compare.mockResolvedValue(true);

      const mockToken = 'mock.jwt.token';
      jwt.sign.mockReturnValue(mockToken);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.token).toBe(mockToken);
      expect(responseData.user.password).toBeUndefined();
    });
  });

  describe('Invalid credentials - user not found', () => {
    it('should return 401 when user does not exist', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid credentials');
    });
  });

  describe('Invalid credentials - wrong password', () => {
    it('should return 401 when password does not match', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const mockUser = {
        _id: 'user123',
        email: 'john@example.com',
        role: 'Admin',
        password: 'hashedpassword'
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      bcrypt.compare.mockResolvedValue(false);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid credentials');
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when validation fails', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'Phone is required' },
          { msg: 'Password is required' }
        ]
      });

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          'Phone is required',
          'Password is required'
        ]
      });

      expect(User.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should pass errors to error handler middleware', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      const mockError = new Error('Database connection failed');
      User.findOne.mockReturnValue({
        select: jest.fn().mockRejectedValue(mockError)
      });

      await login(req, res, next);

      expect(next).toHaveBeenCalledWith(mockError);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});

describe('AuthController - getProfile', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: {
        userId: 'user123',
        role: 'Admin'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  describe('Successful profile retrieval', () => {
    it('should return 200 with user profile data (excluding password)', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin',
        phone: { countryCode: '+91', number: '9876543210' },
        createdAt: new Date('2024-01-15T10:30:00Z')
      };

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await getProfile(req, res, next);

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.user.password).toBeUndefined();
    });
  });

  describe('User not found', () => {
    it('should return 404 when user does not exist', async () => {
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await getProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('User not found');
    });
  });

  describe('Error handling', () => {
    it('should pass errors to error handler middleware', async () => {
      const mockError = new Error('Database connection failed');
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(mockError)
      });

      await getProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(mockError);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('Authentication requirement', () => {
    it('should extract userId from req.user set by auth middleware', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin',
        createdAt: new Date()
      };

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await getProfile(req, res, next);

      expect(User.findById).toHaveBeenCalledWith(req.user.userId);
    });
  });
});
