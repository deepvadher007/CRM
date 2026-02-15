/**
 * Authentication Routes
 * 
 * Defines all authentication-related API endpoints including user registration,
 * login, and profile retrieval. All routes are prefixed with /api/auth.
 * 
 * @module routes/authRoutes
 */

const express = require('express');
const { register, login, getProfile } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../utils/validators');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Register a new user
 * 
 * @route   POST /api/auth/register
 * @desc    Register a new user with email, password, name, and role
 * @access  Public
 * @middleware registerValidation - Validates and sanitizes input data
 * @requirements 1.1, 1.2, 1.4, 1.7
 * 
 * @body {string} name - User's full name (min 2 characters)
 * @body {string} email - Valid email address
 * @body {string} password - Password (min 8 characters)
 * @body {string} role - User role ('Admin' or 'Sales_Agent')
 * 
 * @returns {201} User registered successfully
 * @returns {400} Validation error
 * @returns {409} Email already exists
 */
router.post('/register', registerValidation, register);

/**
 * Login user
 * 
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 * @middleware loginValidation - Validates and sanitizes input data
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5
 * 
 * @body {string} email - User's email address
 * @body {string} password - User's password
 * 
 * @returns {200} Login successful with JWT token
 * @returns {400} Validation error
 * @returns {401} Invalid credentials
 */
router.post('/login', loginValidation, login);

/**
 * Get user profile
 * 
 * @route   GET /api/auth/profile
 * @desc    Get authenticated user's profile information
 * @access  Private (requires valid JWT token in Authorization header)
 * @middleware verifyToken - Validates JWT token and attaches user data to request
 * @requirements 12.1, 12.3
 * 
 * @header {string} Authorization - Bearer token (format: "Bearer <token>")
 * 
 * @returns {200} User profile data
 * @returns {401} Unauthorized (invalid or missing token)
 * @returns {404} User not found
 */
router.get('/profile', verifyToken, getProfile);

module.exports = router;
