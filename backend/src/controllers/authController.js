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
      return res.status(409).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg),
        statusCode: 400
      });
    }

    const { name, phone, email, password, role } = req.body;

    // Check if user with phone already exists
    const existingUserByPhone = await User.findOne({ 
      'phone.countryCode': phone.countryCode,
      'phone.number': phone.number
    });
    
    if (existingUserByPhone) {
      return res.status(409).json({
        success: false,
        message: 'User with this phone number already exists',
        statusCode: 409
      });
    }

    // Check if email is provided and already exists
    if (email) {
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists',
          statusCode: 409
        });
      }
    }

    // Create new user (password will be hashed by pre-save hook)
    const user = new User({
      name,
      phone: {
        countryCode: phone.countryCode || '+91',
        number: phone.number
      },
      email: email || undefined, // Only set if provided
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
        phone: user.phone,
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

    const { identifier, password } = req.body;

    // Detect if identifier is email (contains @) or phone
    let user;
    if (identifier.includes('@')) {
      // Login with email
      user = await User.findOne({ email: identifier });
    } else {
      // Login with phone - extract only digits
      const phoneDigits = identifier.replace(/\D/g, '');
      user = await User.findOne({ 'phone.number': phoneDigits });
    }

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

    // Generate JWT token with payload: userId, phone, email, role
    const payload = {
      userId: user._id,
      phone: user.phone,
      email: user.email,
      role: user.role
    };

    // Set token expiration (7 days)
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    // Return token and user data (exclude password)
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
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
        phone: user.phone,
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
 * Change user password
 * 
 * @async
 * @function changePassword
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.oldPassword - Current password
 * @param {string} req.body.newPassword - New password
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} 200 - Success response
 * @returns {Object} 400 - Validation error
 * @returns {Object} 401 - Invalid old password
 * 
 * @route PUT /api/auth/change-password
 * @access Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Validation
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required',
        statusCode: 400
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
        statusCode: 400
      });
    }

    // Find user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }

    // Verify old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
        statusCode: 401
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all agents (Admin only)
 * 
 * @async
 * @function getAllAgents
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} 200 - Success response with agents list
 * @returns {Object} 403 - Forbidden (not admin)
 * 
 * @route GET /api/auth/agents
 * @access Private (Admin only)
 */
const getAllAgents = async (req, res, next) => {
  try {
    // Only admins can access this
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.',
        statusCode: 403
      });
    }

    const agents = await User.find({ role: 'Agent' })
      .select('_id name phone email')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password - Send reset email
 * 
 * @async
 * @function forgotPassword
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} 200 - Success response (always returns success for security)
 * 
 * @route POST /api/auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        statusCode: 400
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success message (security best practice - don't reveal if email exists)
    const successMessage = 'If an account with that email exists, a password reset link has been sent.';

    if (!user) {
      // Don't reveal that user doesn't exist
      return res.status(200).json({
        success: true,
        message: successMessage
      });
    }

    // Generate reset token using crypto
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token before saving to database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save hashed token and expiration to user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Email message
    const message = `
      You are receiving this email because you (or someone else) has requested a password reset for your account.
      
      Please click on the following link to reset your password:
      
      ${resetUrl}
      
      This link will expire in 15 minutes.
      
      If you did not request this, please ignore this email and your password will remain unchanged.
    `;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff6b35;">Password Reset Request</h2>
        <p>You are receiving this email because you (or someone else) has requested a password reset for your account.</p>
        <p>Please click on the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #999; font-size: 14px;">This link will expire in 15 minutes.</p>
        <p style="color: #999; font-size: 14px;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
      </div>
    `;

    try {
      // Send email
      const sendEmail = require('../utils/sendEmail');
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request - Hanuvansh CRM',
        text: message,
        html: htmlMessage
      });

      res.status(200).json({
        success: true,
        message: successMessage
      });
    } catch (emailError) {
      // If email fails, clear reset token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      console.error('Email send error:', emailError);

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.',
        statusCode: 500
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password using token
 * 
 * @async
 * @function resetPassword
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request params
 * @param {string} req.params.token - Reset token from URL
 * @param {Object} req.body - Request body
 * @param {string} req.body.password - New password
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} 200 - Success response
 * @returns {Object} 400 - Invalid or expired token
 * 
 * @route PUT /api/auth/reset-password/:token
 * @access Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    // Validation
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required',
        statusCode: 400
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
        statusCode: 400
      });
    }

    // Hash the token from URL to compare with database
    const crypto = require('crypto');
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with matching token and non-expired token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
        statusCode: 400
      });
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  changePassword,
  getAllAgents,
  forgotPassword,
  resetPassword
};
