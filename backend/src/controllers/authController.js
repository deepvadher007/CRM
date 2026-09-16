const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg)
      });
    }

    const { name, email, password, role, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user (password will be hashed by pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone
    });

    // Return success response (password excluded by toJSON)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg)
      });
    }

    const { password } = req.body;
    
    // Accept both 'identifier' and 'email' fields for backward compatibility
    const identifier = req.body.identifier || req.body.email;
    
    // Debug logging
    console.log('Login attempt - Identifier:', identifier);

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone and password'
      });
    }

    // Find user by email OR phone number using dot notation
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { "phone.number": identifier }
      ]
    }).select('+password');
    
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Compare password using bcrypt
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    
    console.log('Password match:', isPasswordMatch ? 'Yes' : 'No');
    
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || '3h'
      }
    );

    console.log('Login successful for user:', user.email);

    // Return token and user data
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    // User ID is attached to req.user by auth middleware
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide old password and new password'
      });
    }

    // Validate new password length (minimum 6 characters)
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Find user with password field
    const user = await User.findById(req.user.userId).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify old password
    const isPasswordMatch = await user.comparePassword(oldPassword);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Old password is incorrect'
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

// @desc    Get all agents (for Admin)
// @route   GET /api/auth/agents
// @access  Private (Admin only)
const getAllAgents = async (req, res, next) => {
  try {
    // Find all users with role 'Agent' or 'Admin'
    const agents = await User.find({ role: { $in: ['Agent', 'Admin'] } })
      .select('_id name email role')
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

// @desc    List agents managed via the CRM (Admin only)
// @route   GET /api/auth/manage/agents
// @access  Private (Admin only)
// Returns only users with role 'Agent'. Never returns passwords or other Admins.
const listManagedAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'Agent' })
      .select('_id name email phone role createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Agent (Admin only)
// @route   POST /api/auth/manage/agents
// @access  Private (Admin only)
// Role is always forced to 'Agent' regardless of any role sent in the body,
// so an Admin can never create another Admin through this endpoint.
const createAgent = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg)
      });
    }

    const { name, email, phone, password, confirmPassword } = req.body;

    // Confirm password must match (defense in depth; also validated in validator)
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: ['Passwords do not match']
      });
    }

    // Enforce email uniqueness when an email is provided
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'A user with this email already exists'
        });
      }
    }

    // Enforce phone uniqueness (existing rule: unique countryCode + number)
    const existingPhone = await User.findOne({
      'phone.countryCode': phone.countryCode,
      'phone.number': phone.number
    });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: 'A user with this phone number already exists'
      });
    }

    // Create the agent. Role is forced to 'Agent'.
    // Password is hashed by the existing User pre-save hook (bcryptjs).
    const agent = await User.create({
      name,
      email: email || undefined,
      phone,
      password,
      role: 'Agent'
    });

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      agent: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        role: agent.role,
        createdAt: agent.createdAt
      }
    });
  } catch (error) {
    // Handle duplicate key errors from the unique indexes gracefully
    if (error && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with these details already exists'
      });
    }
    next(error);
  }
};

// @desc    Delete an Agent (Admin only)
// @route   DELETE /api/auth/manage/agents/:id
// @access  Private (Admin only)
// Safety: only deletes the User document. Leads created by, owned by, or
// assigned to the agent are intentionally left intact for the Admin to manage.
const deleteAgent = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid agent ID'
      });
    }

    // Prevent an Admin from deleting themselves through this feature
    if (String(id) === String(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // An Admin must not be able to delete another Admin through this feature
    if (user.role !== 'Agent') {
      return res.status(403).json({
        success: false,
        message: 'Only Agent accounts can be deleted here'
      });
    }

    // Delete ONLY the user document. Leads remain untouched in the database.
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Agent deleted successfully'
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
  listManagedAgents,
  createAgent,
  deleteAgent
};
