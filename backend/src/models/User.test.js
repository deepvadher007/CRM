/**
 * Unit tests for User model
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('./User');
const bcrypt = require('bcryptjs');

let mongoServer;

beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Cleanup
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

describe('User Model - Password Hashing', () => {
  test('should hash password before saving to database', async () => {
    const plainPassword = 'testPassword123';
    
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: plainPassword,
      role: 'Admin'
    });

    await user.save();

    // Password should not be stored in plaintext
    expect(user.password).not.toBe(plainPassword);
    
    // Password should be a bcrypt hash (starts with $2a$ or $2b$)
    expect(user.password).toMatch(/^\$2[ab]\$/);
    
    // Verify the hash is valid by comparing
    const isMatch = await bcrypt.compare(plainPassword, user.password);
    expect(isMatch).toBe(true);
  });

  test('should not rehash password if not modified', async () => {
    const plainPassword = 'testPassword123';
    
    const user = new User({
      name: 'Test User',
      email: 'test2@example.com',
      password: plainPassword,
      role: 'Sales_Agent'
    });

    await user.save();
    const firstHash = user.password;

    // Update a different field
    user.name = 'Updated Name';
    await user.save();

    // Password hash should remain the same
    expect(user.password).toBe(firstHash);
  });

  test('should rehash password if modified', async () => {
    const plainPassword = 'testPassword123';
    
    const user = new User({
      name: 'Test User',
      email: 'test3@example.com',
      password: plainPassword,
      role: 'Admin'
    });

    await user.save();
    const firstHash = user.password;

    // Update password
    const newPassword = 'newPassword456';
    user.password = newPassword;
    await user.save();

    // Password hash should be different
    expect(user.password).not.toBe(firstHash);
    
    // New password should be correctly hashed
    const isMatch = await bcrypt.compare(newPassword, user.password);
    expect(isMatch).toBe(true);
    
    // Old password should not match
    const oldMatch = await bcrypt.compare(plainPassword, user.password);
    expect(oldMatch).toBe(false);
  });

  test('should use salt rounds of 10', async () => {
    const plainPassword = 'testPassword123';
    
    const user = new User({
      name: 'Test User',
      email: 'test4@example.com',
      password: plainPassword,
      role: 'Admin'
    });

    await user.save();

    // Extract salt rounds from bcrypt hash
    // Format: $2a$10$... where 10 is the salt rounds
    const saltRounds = parseInt(user.password.split('$')[2]);
    expect(saltRounds).toBe(10);
  });
});

describe('User Model - Password Comparison', () => {
  test('should return true for correct password', async () => {
    const plainPassword = 'testPassword123';
    
    const user = new User({
      name: 'Test User',
      email: 'compare1@example.com',
      password: plainPassword,
      role: 'Admin'
    });

    await user.save();

    const isMatch = await user.comparePassword(plainPassword);
    expect(isMatch).toBe(true);
  });

  test('should return false for incorrect password', async () => {
    const plainPassword = 'testPassword123';
    
    const user = new User({
      name: 'Test User',
      email: 'compare2@example.com',
      password: plainPassword,
      role: 'Sales_Agent'
    });

    await user.save();

    const isMatch = await user.comparePassword('wrongPassword');
    expect(isMatch).toBe(false);
  });

  test('should handle empty password comparison', async () => {
    const plainPassword = 'testPassword123';
    
    const user = new User({
      name: 'Test User',
      email: 'compare3@example.com',
      password: plainPassword,
      role: 'Admin'
    });

    await user.save();

    const isMatch = await user.comparePassword('');
    expect(isMatch).toBe(false);
  });

  test('should be case-sensitive', async () => {
    const plainPassword = 'TestPassword123';
    
    const user = new User({
      name: 'Test User',
      email: 'compare4@example.com',
      password: plainPassword,
      role: 'Admin'
    });

    await user.save();

    const isMatchCorrect = await user.comparePassword('TestPassword123');
    expect(isMatchCorrect).toBe(true);

    const isMatchWrongCase = await user.comparePassword('testpassword123');
    expect(isMatchWrongCase).toBe(false);
  });
});

describe('User Model - Validation', () => {
  test('should require all mandatory fields', async () => {
    const user = new User({});

    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.password).toBeDefined();
    expect(error.errors.role).toBeDefined();
  });

  test('should enforce minimum password length', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test5@example.com',
      password: 'short',
      role: 'Admin'
    });

    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.password).toBeDefined();
    expect(error.errors.password.message).toContain('at least 8 characters');
  });

  test('should enforce unique email constraint', async () => {
    const email = 'duplicate@example.com';
    
    const user1 = new User({
      name: 'User One',
      email: email,
      password: 'password123',
      role: 'Admin'
    });
    await user1.save();

    const user2 = new User({
      name: 'User Two',
      email: email,
      password: 'password456',
      role: 'Sales_Agent'
    });

    let error;
    try {
      await user2.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000); // MongoDB duplicate key error
  });

  test('should validate email format', async () => {
    const user = new User({
      name: 'Test User',
      email: 'invalid-email',
      password: 'password123',
      role: 'Admin'
    });

    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.email.message).toContain('valid email address');
  });

  test('should validate role enum', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test6@example.com',
      password: 'password123',
      role: 'InvalidRole'
    });

    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.role).toBeDefined();
    expect(error.errors.role.message).toContain('not a valid role');
  });
});
