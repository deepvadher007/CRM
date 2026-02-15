/**
 * Environment Variable Validation Utility
 * 
 * Validates that all required environment variables are present
 * and throws descriptive errors if any are missing.
 * 
 * Requirements: 7.1, 7.2, 7.5
 * 
 * Usage:
 * ```javascript
 * require('dotenv').config();
 * const validateEnv = require('./config/validateEnv');
 * 
 * // Call this at the start of your application
 * validateEnv();
 * ```
 */

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required environment variable is missing
 */
const validateEnv = () => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'MONGODB_URI',
    'PORT'
  ];

  const missingVars = [];

  // Check each required variable
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // If any variables are missing, throw a descriptive error
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      `Please ensure these variables are set in your .env file or environment.`
    );
  }

  // Additional validation for JWT_SECRET length (security best practice)
  if (process.env.JWT_SECRET.length < 32) {
    console.warn(
      'WARNING: JWT_SECRET should be at least 32 characters for security. ' +
      'Current length: ' + process.env.JWT_SECRET.length
    );
  }
};

module.exports = validateEnv;
