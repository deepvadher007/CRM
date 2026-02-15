const { validationResult } = require('express-validator');
const { 
  registerValidation, 
  loginValidation,
  sanitizeInput,
  containsSQLInjection,
  rejectSQLInjection
} = require('./validators');

/**
 * Helper function to run validation and extract errors
 */
const runValidation = async (validations, req) => {
  for (let validation of validations) {
    await validation.run(req);
  }
  return validationResult(req);
};

/**
 * Mock request object factory
 */
const createMockRequest = (body) => ({
  body,
  query: {},
  params: {}
});

describe('Validators', () => {
  describe('registerValidation', () => {
    it('should pass validation with valid registration data', async () => {
      const req = createMockRequest({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Admin'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail validation when name is missing', async () => {
      const req = createMockRequest({
        email: 'john@example.com',
        password: 'password123',
        role: 'Admin'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'name')).toBe(true);
    });

    it('should fail validation when name is too short', async () => {
      const req = createMockRequest({
        name: 'J',
        email: 'john@example.com',
        password: 'password123',
        role: 'Admin'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'name' && err.msg.includes('at least 2 characters'))).toBe(true);
    });

    it('should fail validation when email is missing', async () => {
      const req = createMockRequest({
        name: 'John Doe',
        password: 'password123',
        role: 'Admin'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'email')).toBe(true);
    });

    it('should fail validation with invalid email format', async () => {
      const req = createMockRequest({
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123',
        role: 'Admin'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'email' && err.msg.includes('valid email'))).toBe(true);
    });

    it('should fail validation when password is missing', async () => {
      const req = createMockRequest({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Admin'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'password')).toBe(true);
    });

    it('should fail validation when password is too short', async () => {
      const req = createMockRequest({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'short',
        role: 'Admin'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'password' && err.msg.includes('at least 8 characters'))).toBe(true);
    });

    it('should fail validation when role is missing', async () => {
      const req = createMockRequest({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'role')).toBe(true);
    });

    it('should fail validation with invalid role', async () => {
      const req = createMockRequest({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'InvalidRole'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'role' && err.msg.includes('Admin or Sales_Agent'))).toBe(true);
    });

    it('should accept Sales_Agent as valid role', async () => {
      const req = createMockRequest({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'Sales_Agent'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('should trim whitespace from name and email', async () => {
      const req = createMockRequest({
        name: '  John Doe  ',
        email: '  john@example.com  ',
        password: 'password123',
        role: 'Admin'
      });

      await runValidation(registerValidation, req);
      expect(req.body.name).toBe('John Doe');
      expect(req.body.email).toBe('john@example.com');
    });

    it('should normalize email to lowercase', async () => {
      const req = createMockRequest({
        name: 'John Doe',
        email: 'John@EXAMPLE.COM',
        password: 'password123',
        role: 'Admin'
      });

      await runValidation(registerValidation, req);
      expect(req.body.email).toBe('john@example.com');
    });
  });

  describe('loginValidation', () => {
    it('should pass validation with valid login data', async () => {
      const req = createMockRequest({
        email: 'john@example.com',
        password: 'password123'
      });

      const result = await runValidation(loginValidation, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail validation when email is missing', async () => {
      const req = createMockRequest({
        password: 'password123'
      });

      const result = await runValidation(loginValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'email')).toBe(true);
    });

    it('should fail validation with invalid email format', async () => {
      const req = createMockRequest({
        email: 'not-an-email',
        password: 'password123'
      });

      const result = await runValidation(loginValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'email' && err.msg.includes('valid email'))).toBe(true);
    });

    it('should fail validation when password is missing', async () => {
      const req = createMockRequest({
        email: 'john@example.com'
      });

      const result = await runValidation(loginValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'password')).toBe(true);
    });

    it('should trim whitespace from email', async () => {
      const req = createMockRequest({
        email: '  john@example.com  ',
        password: 'password123'
      });

      await runValidation(loginValidation, req);
      expect(req.body.email).toBe('john@example.com');
    });

    it('should normalize email to lowercase', async () => {
      const req = createMockRequest({
        email: 'John@EXAMPLE.COM',
        password: 'password123'
      });

      await runValidation(loginValidation, req);
      expect(req.body.email).toBe('john@example.com');
    });

    it('should not validate password length for login', async () => {
      // Login should accept any password length since we're just checking credentials
      const req = createMockRequest({
        email: 'john@example.com',
        password: 'short'
      });

      const result = await runValidation(loginValidation, req);
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should escape HTML special characters to prevent XSS', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(sanitized).not.toContain('<script>');
    });

    it('should escape ampersands', () => {
      const input = 'Tom & Jerry';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('Tom &amp; Jerry');
    });

    it('should escape single quotes', () => {
      const input = "It's a test";
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('It&#x27;s a test');
    });

    it('should escape double quotes', () => {
      const input = 'He said "hello"';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('He said &quot;hello&quot;');
    });

    it('should escape forward slashes', () => {
      const input = '</script>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('&lt;&#x2F;script&gt;');
    });

    it('should handle non-string values', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });

  describe('containsSQLInjection', () => {
    it('should detect SELECT statements', () => {
      expect(containsSQLInjection('SELECT * FROM users')).toBe(true);
      expect(containsSQLInjection('select * from users')).toBe(true);
    });

    it('should detect INSERT statements', () => {
      expect(containsSQLInjection('INSERT INTO users')).toBe(true);
      expect(containsSQLInjection('insert into users')).toBe(true);
    });

    it('should detect UPDATE statements', () => {
      expect(containsSQLInjection('UPDATE users SET')).toBe(true);
      expect(containsSQLInjection('update users set')).toBe(true);
    });

    it('should detect DELETE statements', () => {
      expect(containsSQLInjection('DELETE FROM users')).toBe(true);
      expect(containsSQLInjection('delete from users')).toBe(true);
    });

    it('should detect DROP statements', () => {
      expect(containsSQLInjection('DROP TABLE users')).toBe(true);
      expect(containsSQLInjection('drop table users')).toBe(true);
    });

    it('should detect SQL comments', () => {
      expect(containsSQLInjection('admin--')).toBe(true);
      expect(containsSQLInjection('/* comment */')).toBe(true);
    });

    it('should detect OR-based injection', () => {
      expect(containsSQLInjection("' OR '1'='1")).toBe(true);
      expect(containsSQLInjection("admin' OR 1=1--")).toBe(true);
    });

    it('should detect AND-based injection', () => {
      expect(containsSQLInjection("' AND '1'='1")).toBe(true);
      expect(containsSQLInjection("admin' AND 1=1--")).toBe(true);
    });

    it('should detect UNION-based injection', () => {
      expect(containsSQLInjection('UNION SELECT')).toBe(true);
      expect(containsSQLInjection('union select')).toBe(true);
    });

    it('should detect encoded SQL injection attempts', () => {
      expect(containsSQLInjection('%27%20OR%20%271%27%3D%271')).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(containsSQLInjection('John Doe')).toBe(false);
      expect(containsSQLInjection('john@example.com')).toBe(false);
      expect(containsSQLInjection('password123')).toBe(false);
    });

    it('should handle non-string values', () => {
      expect(containsSQLInjection(123)).toBe(false);
      expect(containsSQLInjection(null)).toBe(false);
      expect(containsSQLInjection(undefined)).toBe(false);
    });
  });

  describe('rejectSQLInjection', () => {
    it('should throw error for SQL injection attempts', () => {
      expect(() => rejectSQLInjection('SELECT * FROM users')).toThrow('Invalid input detected');
      expect(() => rejectSQLInjection("' OR '1'='1")).toThrow('Invalid input detected');
    });

    it('should return true for safe input', () => {
      expect(rejectSQLInjection('John Doe')).toBe(true);
      expect(rejectSQLInjection('john@example.com')).toBe(true);
      expect(rejectSQLInjection('password123')).toBe(true);
    });
  });

  describe('registerValidation with sanitization', () => {
    it('should reject SQL injection in name field', async () => {
      const req = createMockRequest({
        name: "John'; DROP TABLE users--",
        email: 'john@example.com',
        password: 'password123',
        role: 'Admin'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'name' && err.msg === 'Invalid input detected')).toBe(true);
    });

    it('should reject SQL injection in email field', async () => {
      const req = createMockRequest({
        name: 'John Doe',
        email: "admin'--@example.com",
        password: 'password123',
        role: 'Admin'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'email' && err.msg === 'Invalid input detected')).toBe(true);
    });

    it('should reject SQL injection in password field', async () => {
      const req = createMockRequest({
        name: 'John Doe',
        email: 'john@example.com',
        password: "password' OR '1'='1",
        role: 'Admin'
      });

      const result = await runValidation(registerValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'password' && err.msg === 'Invalid input detected')).toBe(true);
    });

    it('should sanitize XSS in name field', async () => {
      const req = createMockRequest({
        name: '<script>alert("XSS")</script>',
        email: 'john@example.com',
        password: 'password123',
        role: 'Admin'
      });

      await runValidation(registerValidation, req);
      // The name should be sanitized to escape HTML
      expect(req.body.name).not.toContain('<script>');
      expect(req.body.name).toContain('&lt;script&gt;');
    });
  });

  describe('loginValidation with sanitization', () => {
    it('should reject SQL injection in email field', async () => {
      const req = createMockRequest({
        email: "admin'--@example.com",
        password: 'password123'
      });

      const result = await runValidation(loginValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'email' && err.msg === 'Invalid input detected')).toBe(true);
    });

    it('should reject SQL injection in password field', async () => {
      const req = createMockRequest({
        email: 'john@example.com',
        password: "' OR '1'='1"
      });

      const result = await runValidation(loginValidation, req);
      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      expect(errors.some(err => err.path === 'password' && err.msg === 'Invalid input detected')).toBe(true);
    });
  });
});
