/**
 * Unit tests for environment validation utility
 */

const validateEnv = require('./validateEnv');

describe('validateEnv', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test('should pass when all required variables are present', () => {
    process.env.JWT_SECRET = 'test_secret_key_with_at_least_32_characters_for_security';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.PORT = '5000';

    expect(() => validateEnv()).not.toThrow();
  });

  test('should throw error when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.PORT = '5000';

    expect(() => validateEnv()).toThrow('Missing required environment variables: JWT_SECRET');
  });

  test('should throw error when MONGODB_URI is missing', () => {
    process.env.JWT_SECRET = 'test_secret_key_with_at_least_32_characters_for_security';
    delete process.env.MONGODB_URI;
    process.env.PORT = '5000';

    expect(() => validateEnv()).toThrow('Missing required environment variables: MONGODB_URI');
  });

  test('should throw error when PORT is missing', () => {
    process.env.JWT_SECRET = 'test_secret_key_with_at_least_32_characters_for_security';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    delete process.env.PORT;

    expect(() => validateEnv()).toThrow('Missing required environment variables: PORT');
  });

  test('should throw error when multiple variables are missing', () => {
    delete process.env.JWT_SECRET;
    delete process.env.MONGODB_URI;
    process.env.PORT = '5000';

    expect(() => validateEnv()).toThrow('Missing required environment variables: JWT_SECRET, MONGODB_URI');
  });

  test('should warn when JWT_SECRET is too short', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    process.env.JWT_SECRET = 'short_secret';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.PORT = '5000';

    validateEnv();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('JWT_SECRET should be at least 32 characters')
    );

    consoleWarnSpy.mockRestore();
  });
});
