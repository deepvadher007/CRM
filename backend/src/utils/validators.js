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
 * Validates: name, phone (countryCode + number), email (optional), password, role
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

  body('phone.countryCode')
    .trim()
    .notEmpty()
    .withMessage('Country code is required')
    .matches(/^\+\d{1,4}$/)
    .withMessage('Country code must start with + and contain 1-4 digits'),

  body('phone.number')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\d{10,15}$/)
    .withMessage('Phone number must be 10-15 digits')
    .custom(rejectSQLInjection),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
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
    .isIn(['Admin', 'Agent'])
    .withMessage('Role must be either Admin or Agent')
];

/**
 * Validation schema for Admin creating an Agent (Manage Agents feature)
 * Validates: name, phone (countryCode + number), email, password, confirmPassword
 * Reuses the same phone/email/password rules as registration.
 * Role is NOT accepted here; the controller always forces role = 'Agent'.
 */
const createAgentValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long')
    .custom(rejectSQLInjection)
    .customSanitizer(sanitizeInput),

  body('phone.countryCode')
    .trim()
    .notEmpty()
    .withMessage('Country code is required')
    .matches(/^\+\d{1,4}$/)
    .withMessage('Country code must start with + and contain 1-4 digits'),

  body('phone.number')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\d{10,15}$/)
    .withMessage('Phone number must be 10-15 digits')
    .custom(rejectSQLInjection),

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

  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm the password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

/**
 * Validation schema for user login
 * Validates: identifier (email or phone), password
 * Includes sanitization for XSS and SQL injection protection
 */
const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or phone number is required')
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

  body('leadFrom')
    .optional()
    .trim()
    .custom(rejectSQLInjection)
    .customSanitizer(sanitizeInput),

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
    .withMessage('Invalid date format'),

  // --- Real-estate fields (all optional, backward compatible) ---
  body('requirement')
    .optional()
    .trim()
    .custom(rejectSQLInjection)
    .customSanitizer(sanitizeInput),

  body('budget')
    .optional()
    .trim()
    .custom(rejectSQLInjection)
    .customSanitizer(sanitizeInput),

  body('stage')
    .optional()
    .trim()
    .custom(rejectSQLInjection)
    .customSanitizer(sanitizeInput),

  body('temperature')
    .optional({ checkFalsy: true })
    .isIn(['Hot', 'Warm', 'Cold'])
    .withMessage('Temperature must be Hot, Warm, or Cold'),

  body('lastContacted')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Invalid last contacted date format')
];

module.exports = {
  registerValidation,
  createAgentValidation,
  loginValidation,
  leadValidation,
  sanitizeInput,
  containsSQLInjection,
  rejectSQLInjection
};
