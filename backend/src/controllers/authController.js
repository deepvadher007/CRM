/**
 * Authentication Controller
 * Handles user registration, login, and profile retrieval
 * 
 * @module controllers/authController
 */

const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Register a new user
 * 
 * Creates a new user account with the provided credentials. The password is automatically
 * hashed before storage using bcrypt (10 salt rounds). Validates all input data and checks
 * for duplicate email addresses.
 * 
 * @async
 * @function register
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - User's full name (required, min 2 characters)
 * @param {string} req.body.email - User's email address (required, must be valid email format)
 * @param {string} req.body.password - User's password (required, min 8 characters)
 * @param {string} req.body.role - User's role (required, must be 'Admin' or 'Sales_Agent')
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} 201 - Success response with user data (excluding password)
 * @returns {Object} 400 - Validation error response
 * @returns {Object} 409 - Conflict error (email already exists)
 * @returns {Object} 500 - Server error response
 * 
 * @example
 * // Request body
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "SecurePass123",
 *   "role": "Admin"
 * }
 * 
 * // Success response (201)
 * {
 *   "success": true,
 *   "message": "User registered successfully",
 *   "user": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "role": "Admin",
 *     "createdAt": "2024-01-15T10:30:00.000Z"
 *   }
 * }
 * 
 * @route POST /api/auth/register
 * @access Public
 * @requirements 1.1, 1.2, 1.4, 1.7
 */
const register = async (req, res, next) => {
  try {
    // Validate request body using express-validator results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg),
        statusCode: 400
      });
    }

    const { name, email, password, role } = req.body;

    // Check if user with email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        statusCode: 409
      });
    }

    // Create new user (password will be hashed by pre-save hook)
    const user = new User({
      name,
      email,
      password,
      role
    });

    await user.save();

    // Return success response with user data (exclude password)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    // Pass errors to error handler middleware
    next(error);
  }
};

/**
 * Login user
 * 
 * Authenticates a user with email and password credentials. Verifies the password using
 * bcrypt comparison and generates a JWT token upon successful authentication. The token
 * includes user ID, email, and role in the payload and expires after 15 minutes.
 * 
 * @async
 * @function login
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address (required)
 * @param {string} req.body.password - User's password (required)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} 200 - Success response with JWT token and user data
 * @returns {Object} 400 - Validation error response
 * @returns {Object} 401 - Authentication error (invalid credentials)
 * @returns {Object} 500 - Server error response
 * 
 * @example
 * // Request body
 * {
 *   "email": "john@example.com",
 *   "password": "SecurePass123"
 * }
 * 
 * // Success response (200)
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "user": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "role": "Admin"
 *   }
 * }
 * 
 * @route POST /api/auth/login
 * @access Public
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
const login = async (req, res, next) => {
  try {
    // Validate request body using express-validator results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg),
        statusCode: 400
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        statusCode: 401
      });
    }

    // Compare password using user.comparePassword method
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        statusCode: 401
      });
    }

    // Generate JWT token with payload: userId, email, role
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    // Set token expiration (15 minutes)
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '15m'
    });

    // Return token and user data (exclude password)
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    // Pass errors to error handler middleware
    next(error);
  }
};

/**
 * Get authenticated user profile
 * 
 * Retrieves the profile information for the currently authenticated user. The user ID is
 * extracted from the JWT token by the authentication middleware. Returns all user data
 * except the password hash.
 * 
 * @async
 * @function getProfile
 * @param {Object} req - Express request object
 * @param {Object} req.user - User data from JWT token (set by auth middleware)
 * @param {string} req.user.userId - Authenticated user's ID
 * @param {string} req.user.email - Authenticated user's email
 * @param {string} req.user.role - Authenticated user's role
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} 200 - Success response with user profile data
 * @returns {Object} 401 - Unauthorized (no valid token provided)
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Server error response
 * 
 * @example
 * // Request headers
 * {
 *   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * 
 * // Success response (200)
 * {
 *   "success": true,
 *   "user": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "role": "Admin",
 *     "createdAt": "2024-01-15T10:30:00.000Z"
 *   }
 * }
 * 
 * @route GET /api/auth/profile
 * @access Private (requires valid JWT token)
 * @requirements 12.1, 12.2
 */
const getProfile = async (req, res, next) => {
  try {
    // Extract user ID from req.user (set by auth middleware)
    const userId = req.user.userId;

    // Find user by ID and exclude password field
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }

    // Return user profile data
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    // Pass errors to error handler middleware
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile
};
