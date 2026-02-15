const { register, login, getProfile } = require('./authController');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../models/User');
jest.mock('express-validator');
jest.mock('jsonwebtoken');

// Mock environment variable
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';

describe('AuthController - register', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock request object
    req = {
      body: {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Admin'
      }
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock next function
    next = jest.fn();
  });

  describe('Successful registration', () => {
    it('should create a new user and return 201 with user data (excluding password)', async () => {
      // Mock validation result - no errors
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      // Mock User.findOne - no existing user
      User.findOne.mockResolvedValue(null);

      // Mock user save
      const mockUser = {
        _id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin',
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue(true)
      };
      User.mockImplementation(() => mockUser);

      await register(req, res, next);

      // Verify User.findOne was called with correct email
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });

      // Verify user was created with correct data
      expect(User).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Admin'
      });

      // Verify save was called
      expect(mockUser.save).toHaveBeenCalled();

      // Verify response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        user: {
          _id: 'user123',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'Admin',
          createdAt: mockUser.createdAt
        }
      });

      // Verify password is not in response
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.user.password).toBeUndefined();
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when validation fails', async () => {
      // Mock validation result - with errors
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'Email is required' },
          { msg: 'Password must be at least 8 characters long' }
        ]
      });

      await register(req, res, next);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          'Email is required',
          'Password must be at least 8 characters long'
        ],
        statusCode: 400
      });

      // Verify User.findOne was not called
      expect(User.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate email', () => {
    it('should return 409 when user with email already exists', async () => {
      // Mock validation result - no errors
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      // Mock User.findOne - existing user found
      User.findOne.mockResolvedValue({
        _id: 'existing123',
        email: 'john@example.com'
      });

      await register(req, res, next);

      // Verify User.findOne was called
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });

      // Verify response
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email already exists',
        statusCode: 409
      });

      // Verify User constructor was not called
      expect(User).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should pass errors to error handler middleware', async () => {
      // Mock validation result - no errors
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      // Mock User.findOne to throw error
      const mockError = new Error('Database connection failed');
      User.findOne.mockRejectedValue(mockError);

      await register(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(mockError);

      // Verify response methods were not called
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});

describe('AuthController - login', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock request object
    req = {
      body: {
        email: 'john@example.com',
        password: 'password123'
      }
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock next function
    next = jest.fn();
  });

  describe('Successful login', () => {
    it('should authenticate user and return 200 with token and user data (excluding password)', async () => {
      // Mock validation result - no errors
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      // Mock user with comparePassword method
      const mockUser = {
        _id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin',
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      // Mock User.findOne - user found
      User.findOne.mockResolvedValue(mockUser);

      // Mock JWT token generation
      const mockToken = 'mock.jwt.token';
      jwt.sign.mockReturnValue(mockToken);

      await login(req, res, next);

      // Verify User.findOne was called with correct email
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });

      // Verify comparePassword was called with correct password
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');

      // Verify JWT token was generated with correct payload and expiration
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: 'user123',
          email: 'john@example.com',
          role: 'Admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        token: mockToken,
        user: {
          _id: 'user123',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'Admin'
        }
      });

      // Verify password is not in response
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.user.password).toBeUndefined();
    });
  });

  describe('Invalid credentials - user not found', () => {
    it('should return 401 when user with email does not exist', async () => {
      // Mock validation result - no errors
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      // Mock User.findOne - no user found
      User.findOne.mockResolvedValue(null);

      await login(req, res, next);

      // Verify User.findOne was called
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });

      // Verify response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials',
        statusCode: 401
      });

      // Verify JWT was not generated
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('Invalid credentials - wrong password', () => {
    it('should return 401 when password does not match', async () => {
      // Mock validation result - no errors
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      // Mock user with comparePassword method that returns false
      const mockUser = {
        _id: 'user123',
        email: 'john@example.com',
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      // Mock User.findOne - user found
      User.findOne.mockResolvedValue(mockUser);

      await login(req, res, next);

      // Verify User.findOne was called
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });

      // Verify comparePassword was called
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');

      // Verify response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials',
        statusCode: 401
      });

      // Verify JWT was not generated
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when validation fails', async () => {
      // Mock validation result - with errors
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { msg: 'Email is required' },
          { msg: 'Password is required' }
        ]
      });

      await login(req, res, next);

      // Verify response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          'Email is required',
          'Password is required'
        ],
        statusCode: 400
      });

      // Verify User.findOne was not called
      expect(User.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should pass errors to error handler middleware', async () => {
      // Mock validation result - no errors
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      // Mock User.findOne to throw error
      const mockError = new Error('Database connection failed');
      User.findOne.mockRejectedValue(mockError);

      await login(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(mockError);

      // Verify response methods were not called
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});

describe('AuthController - getProfile', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock request object with authenticated user
    req = {
      user: {
        userId: 'user123',
        email: 'john@example.com',
        role: 'Admin'
      }
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock next function
    next = jest.fn();
  });

  describe('Successful profile retrieval', () => {
    it('should return 200 with user profile data (excluding password)', async () => {
      // Mock user data
      const mockUser = {
        _id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin',
        createdAt: new Date('2024-01-15T10:30:00Z')
      };

      // Mock User.findById with select method
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await getProfile(req, res, next);

      // Verify User.findById was called with correct userId
      expect(User.findById).toHaveBeenCalledWith('user123');

      // Verify select was called to exclude password
      expect(User.findById().select).toHaveBeenCalledWith('-password');

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: {
          _id: 'user123',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'Admin',
          createdAt: mockUser.createdAt
        }
      });

      // Verify password is not in response
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.user.password).toBeUndefined();
    });
  });

  describe('User not found', () => {
    it('should return 404 when user does not exist', async () => {
      // Mock User.findById with select method returning null
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await getProfile(req, res, next);

      // Verify User.findById was called
      expect(User.findById).toHaveBeenCalledWith('user123');

      // Verify response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    });
  });

  describe('Error handling', () => {
    it('should pass errors to error handler middleware', async () => {
      // Mock User.findById to throw error
      const mockError = new Error('Database connection failed');
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(mockError)
      });

      await getProfile(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(mockError);

      // Verify response methods were not called
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('Authentication requirement', () => {
    it('should extract userId from req.user set by auth middleware', async () => {
      // Mock user data
      const mockUser = {
        _id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin',
        createdAt: new Date()
      };

      // Mock User.findById with select method
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await getProfile(req, res, next);

      // Verify that userId was extracted from req.user
      expect(User.findById).toHaveBeenCalledWith(req.user.userId);
    });
  });
});
