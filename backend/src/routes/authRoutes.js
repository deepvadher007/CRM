/**
 * Authentication Routes
 * 
 * Defines all authentication-related API endpoints including user registration,
 * login, and profile retrieval. All routes are prefixed with /api/auth.
 * 
 * @module routes/authRoutes
 */

const express = require('express');
const {
  register,
  login,
  getProfile,
  changePassword,
  getAllAgents,
  listManagedAgents,
  createAgent,
  deleteAgent
} = require('../controllers/authController');
const { registerValidation, loginValidation, createAgentValidation } = require('../utils/validators');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');

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

/**
 * Change password
 * 
 * @route   PUT /api/auth/change-password
 * @desc    Change authenticated user's password
 * @access  Private (requires valid JWT token in Authorization header)
 * @middleware verifyToken - Validates JWT token and attaches user data to request
 * 
 * @header {string} Authorization - Bearer token (format: "Bearer <token>")
 * @body {string} oldPassword - Current password
 * @body {string} newPassword - New password (min 8 characters)
 * 
 * @returns {200} Password changed successfully
 * @returns {400} Validation error
 * @returns {401} Invalid old password
 */
router.put('/change-password', verifyToken, changePassword);

/**
 * Get all agents
 * 
 * @route   GET /api/auth/agents
 * @desc    Get list of all agents (Admin only)
 * @access  Private (Admin only)
 * @middleware verifyToken - Validates JWT token and attaches user data to request
 * 
 * @header {string} Authorization - Bearer token (format: "Bearer <token>")
 * 
 * @returns {200} List of agents
 * @returns {403} Forbidden (not admin)
 */
router.get('/agents', verifyToken, getAllAgents);

/**
 * Manage Agents (Admin only)
 *
 * These endpoints power the Admin-only "Manage Agents" feature. They are kept
 * separate from GET /agents (used for lead assignment) so existing behaviour is
 * unchanged. All routes require a valid JWT and the Admin role.
 */

/**
 * @route   GET /api/auth/manage/agents
 * @desc    List all Agent accounts (no passwords)
 * @access  Private (Admin only)
 */
router.get('/manage/agents', verifyToken, requireRole('Admin'), listManagedAgents);

/**
 * @route   POST /api/auth/manage/agents
 * @desc    Create a new Agent (role forced to 'Agent')
 * @access  Private (Admin only)
 */
router.post('/manage/agents', verifyToken, requireRole('Admin'), createAgentValidation, createAgent);

/**
 * @route   DELETE /api/auth/manage/agents/:id
 * @desc    Delete an Agent (leads are preserved)
 * @access  Private (Admin only)
 */
router.delete('/manage/agents/:id', verifyToken, requireRole('Admin'), deleteAgent);

module.exports = router;
