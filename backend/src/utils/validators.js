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
 * Validates: name, phone, password, role
 * Includes sanitization for XSS and SQL injection protection
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

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^\d{10,15}$/)
    .withMessage('Phone must be 10-15 digits')
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
    .isIn(['Admin', 'Agent'])
    .withMessage('Role must be either Admin or Agent')
];

/**
 * Validation schema for user login
 * Validates: phone, password
 * Includes sanitization for XSS and SQL injection protection
 */
const loginValidation = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^\d{10,15}$/)
    .withMessage('Phone must be 10-15 digits')
    .custom(rejectSQLInjection),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .custom(rejectSQLInjection)
];

/**
 * Validation schema for lead creation/update
 */
const leadValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .custom(rejectSQLInjection)
    .customSanitizer(sanitizeInput),

  body('number')
    .trim()
    .notEmpty()
    .withMessage('Number is required')
    .custom(rejectSQLInjection),

  body('remark')
    .optional()
    .trim()
    .custom(rejectSQLInjection)
    .customSanitizer(sanitizeInput),

  body('status')
    .optional()
    .isIn(['CNR', 'FOLLOW_UP', 'NOT_INTERESTED', 'BOOKED', 'INVALID_NO'])
    .withMessage('Invalid status'),

  body('followUpDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
];

module.exports = {
  registerValidation,
  loginValidation,
  leadValidation,
  sanitizeInput,
  containsSQLInjection,
  rejectSQLInjection
};
