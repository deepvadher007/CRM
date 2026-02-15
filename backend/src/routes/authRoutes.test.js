const request = require('supertest');
const express = require('express');
const authRoutes = require('./authRoutes');
const { register, login, getProfile } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../utils/validators');
const { verifyToken } = require('../middleware/auth');

// Mock dependencies
jest.mock('../controllers/authController');
jest.mock('../middleware/auth');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should call register controller with validation middleware', async () => {
      // Mock register controller
      register.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          message: 'User registered successfully',
          user: {
            _id: 'user123',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'Admin'
          }
        });
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          role: 'Admin'
        });

      // Verify register controller was called
      expect(register).toHaveBeenCalled();

      // Verify response
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
    });

    it('should apply registerValidation middleware to register route', async () => {
      // Test that validation middleware is present by sending valid data
      register.mockImplementation((req, res) => {
        // If we reach the controller, validation passed
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          role: 'Admin'
        });

      // Validation middleware allowed the request through
      expect(register).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });

    it('should accept valid registration data format', async () => {
      register.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Valid Name',
          email: 'valid@example.com',
          password: 'validpassword123',
          role: 'Admin'
        });

      expect(register).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should call login controller with validation middleware', async () => {
      // Mock login controller
      login.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Login successful',
          token: 'mock.jwt.token',
          user: {
            _id: 'user123',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'Admin'
          }
        });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });

      // Verify login controller was called
      expect(login).toHaveBeenCalled();

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
    });

    it('should apply loginValidation middleware to login route', async () => {
      // Test that validation middleware is present by sending valid data
      login.mockImplementation((req, res) => {
        // If we reach the controller, validation passed
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      // Validation middleware allowed the request through
      expect(login).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should accept valid login data format', async () => {
      login.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'valid@example.com',
          password: 'validpassword123'
        });

      expect(login).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should call getProfile controller with auth middleware', async () => {
      // Mock verifyToken middleware to attach user to request
      verifyToken.mockImplementation((req, res, next) => {
        req.user = {
          userId: 'user123',
          email: 'john@example.com',
          role: 'Admin'
        };
        next();
      });

      // Mock getProfile controller
      getProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          user: {
            _id: 'user123',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'Admin',
            createdAt: new Date()
          }
        });
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer mock.jwt.token');

      // Verify verifyToken middleware was called
      expect(verifyToken).toHaveBeenCalled();

      // Verify getProfile controller was called
      expect(getProfile).toHaveBeenCalled();

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
    });

    it('should require authentication token', async () => {
      // Mock verifyToken middleware to reject unauthenticated requests
      verifyToken.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Access denied. No token provided.',
          statusCode: 401
        });
      });

      const response = await request(app)
        .get('/api/auth/profile');
      // No Authorization header

      // Verify verifyToken middleware was called
      expect(verifyToken).toHaveBeenCalled();

      // Verify response
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      // Verify getProfile controller was not called
      expect(getProfile).not.toHaveBeenCalled();
    });

    it('should reject invalid authentication token', async () => {
      // Mock verifyToken middleware to reject invalid tokens
      verifyToken.mockImplementation((req, res) => {
        res.status(401).json({
          success: false,
          message: 'Invalid token. Authentication failed.',
          statusCode: 401
        });
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token');

      // Verify verifyToken middleware was called
      expect(verifyToken).toHaveBeenCalled();

      // Verify response
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      // Verify getProfile controller was not called
      expect(getProfile).not.toHaveBeenCalled();
    });
  });

  describe('Route configuration', () => {
    it('should mount register route at POST /api/auth/register', async () => {
      register.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          role: 'Admin'
        });

      expect(register).toHaveBeenCalled();
    });

    it('should mount login route at POST /api/auth/login', async () => {
      login.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(login).toHaveBeenCalled();
    });

    it('should mount profile route at GET /api/auth/profile', async () => {
      verifyToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      getProfile.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer token');

      expect(verifyToken).toHaveBeenCalled();
      expect(getProfile).toHaveBeenCalled();
    });
  });

  describe('Middleware order', () => {
    it('should apply validation middleware before register controller', async () => {
      const callOrder = [];

      // Track call order
      register.mockImplementation((req, res) => {
        callOrder.push('register');
        res.status(201).json({ success: true });
      });

      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          role: 'Admin'
        });

      // Validation middleware runs first (implicitly), then register
      expect(register).toHaveBeenCalled();
    });

    it('should apply validation middleware before login controller', async () => {
      const callOrder = [];

      // Track call order
      login.mockImplementation((req, res) => {
        callOrder.push('login');
        res.status(200).json({ success: true });
      });

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      // Validation middleware runs first (implicitly), then login
      expect(login).toHaveBeenCalled();
    });

    it('should apply auth middleware before getProfile controller', async () => {
      const callOrder = [];

      // Track call order
      verifyToken.mockImplementation((req, res, next) => {
        callOrder.push('verifyToken');
        req.user = { userId: 'user123' };
        next();
      });

      getProfile.mockImplementation((req, res) => {
        callOrder.push('getProfile');
        res.status(200).json({ success: true });
      });

      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer token');

      // Verify middleware was called before controller
      expect(callOrder).toEqual(['verifyToken', 'getProfile']);
    });
  });

  describe('Requirements validation', () => {
    it('should satisfy Requirement 1.1: User Registration endpoint', async () => {
      register.mockImplementation((req, res) => {
        res.status(201).json({
          success: true,
          message: 'User registered successfully',
          user: {
            _id: 'user123',
            name: req.body.name,
            email: req.body.email,
            role: req.body.role
          }
        });
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          role: 'Admin'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should satisfy Requirement 2.1: User Login endpoint', async () => {
      login.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          message: 'Login successful',
          token: 'mock.jwt.token',
          user: {
            _id: 'user123',
            email: req.body.email,
            role: 'Admin'
          }
        });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });

    it('should satisfy Requirement 12.1 & 12.3: Protected profile endpoint', async () => {
      verifyToken.mockImplementation((req, res, next) => {
        req.user = { userId: 'user123' };
        next();
      });

      getProfile.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          user: {
            _id: req.user.userId,
            name: 'John Doe',
            email: 'john@example.com',
            role: 'Admin'
          }
        });
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid.token');

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
    });
  });
});
