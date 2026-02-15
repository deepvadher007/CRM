const { body } = require('express-validator');

/**
 * Sanitizes input to prevent XSS attacks
 * Escapes HTML special characters
 * Requirements: 10.3
 */
const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  
  // Escape HTML special characters to prevent XSS
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Checks for SQL injection patterns
 * Requirements: 10.3
 */
const containsSQLInjection = (value) => {
  if (typeof value !== 'string') return false;
  
  // Common SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
    /(--|\;|\/\*|\*\/)/,
    /('|(\\')|('')|(%27)|(%23)|(%3D))/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(value));
};

/**
 * Custom validator to reject SQL injection attempts
 * Requirements: 10.3
 */
const rejectSQLInjection = (value) => {
  if (containsSQLInjection(value)) {
    throw new Error('Invalid input detected');
  }
  return true;
};

/**
 * Validation schema for user registration
 * Validates: name, email, password, role
 * Includes sanitization for XSS and SQL injection protection
 * Requirements: 1.5, 1.6, 1.7, 10.1, 10.2, 10.3
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long')
    .custom(rejectSQLInjection)
    .customSanitizer(sanitizeInput),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .custom(rejectSQLInjection),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .custom(rejectSQLInjection),

  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['Admin', 'Sales_Agent'])
    .withMessage('Role must be either Admin or Sales_Agent')
];

/**
 * Validation schema for user login
 * Validates: email, password
 * Includes sanitization for XSS and SQL injection protection
 * Requirements: 1.5, 10.1, 10.2, 10.3
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .custom(rejectSQLInjection),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .custom(rejectSQLInjection)
];

module.exports = {
  registerValidation,
  loginValidation,
  sanitizeInput,
  containsSQLInjection,
  rejectSQLInjection
};
