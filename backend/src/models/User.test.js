/**
 * Unit tests for User model
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('./User');
const bcrypt = require('bcryptjs');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}, 300000); // Allow up to 5 min for first-time MongoDB binary download

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

// Helper to build a valid phone object
const makePhone = (number) => ({ countryCode: '+91', number });

describe('User Model - Password Hashing', () => {
  test('should hash password before saving to database', async () => {
    const plainPassword = 'testPassword123';

    const user = new User({
      name: 'Test User',
      phone: makePhone('9876543210'),
      password: plainPassword,
      role: 'Admin'
    });

    await user.save();

    expect(user.password).not.toBe(plainPassword);
    expect(user.password).toMatch(/^\$2[ab]\$/);

    const isMatch = await bcrypt.compare(plainPassword, user.password);
    expect(isMatch).toBe(true);
  }, 30000);

  test('should not rehash password if not modified', async () => {
    const plainPassword = 'testPassword123';

    const user = new User({
      name: 'Test User',
      phone: makePhone('9876543211'),
      password: plainPassword,
      role: 'Agent'
    });

    await user.save();
    const firstHash = user.password;

    user.name = 'Updated Name';
    await user.save();

    expect(user.password).toBe(firstHash);
  }, 30000);

  test('should rehash password if modified', async () => {
    const plainPassword = 'testPassword123';

    const user = new User({
      name: 'Test User',
      phone: makePhone('9876543212'),
      password: plainPassword,
      role: 'Admin'
    });

    await user.save();
    const firstHash = user.password;

    const newPassword = 'newPassword456';
    user.password = newPassword;
    await user.save();

    expect(user.password).not.toBe(firstHash);

    const isMatch = await bcrypt.compare(newPassword, user.password);
    expect(isMatch).toBe(true);

    const oldMatch = await bcrypt.compare(plainPassword, user.password);
    expect(oldMatch).toBe(false);
  }, 30000);

  test('should use salt rounds of 10', async () => {
    const plainPassword = 'testPassword123';

    const user = new User({
      name: 'Test User',
      phone: makePhone('9876543213'),
      password: plainPassword,
      role: 'Admin'
    });

    await user.save();

    // Format: $2a$10$... where 10 is the salt rounds
    const saltRounds = parseInt(user.password.split('$')[2]);
    expect(saltRounds).toBe(10);
  }, 30000);
});

describe('User Model - Password Comparison', () => {
  test('should return true for correct password', async () => {
    const plainPassword = 'testPassword123';

    const user = new User({
      name: 'Test User',
      phone: makePhone('9876543214'),
      password: plainPassword,
      role: 'Admin'
    });

    await user.save();

    const isMatch = await user.comparePassword(plainPassword);
    expect(isMatch).toBe(true);
  }, 30000);

  test('should return false for incorrect password', async () => {
    const plainPassword = 'testPassword123';

    const user = new User({
      name: 'Test User',
      phone: makePhone('9876543215'),
      password: plainPassword,
      role: 'Agent'
    });

    await user.save();

    const isMatch = await user.comparePassword('wrongPassword');
    expect(isMatch).toBe(false);
  }, 30000);

  test('should handle empty password comparison', async () => {
    const plainPassword = 'testPassword123';

    const user = new User({
      name: 'Test User',
      phone: makePhone('9876543216'),
      password: plainPassword,
      role: 'Admin'
    });

    await user.save();

    const isMatch = await user.comparePassword('');
    expect(isMatch).toBe(false);
  }, 30000);

  test('should be case-sensitive', async () => {
    const plainPassword = 'TestPassword123';

    const user = new User({
      name: 'Test User',
      phone: makePhone('9876543217'),
      password: plainPassword,
      role: 'Admin'
    });

    await user.save();

    const isMatchCorrect = await user.comparePassword('TestPassword123');
    expect(isMatchCorrect).toBe(true);

    const isMatchWrongCase = await user.comparePassword('testpassword123');
    expect(isMatchWrongCase).toBe(false);
  }, 30000);
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
    expect(error.errors.password).toBeDefined();
    expect(error.errors.role).toBeDefined();
  }, 30000);

  test('should enforce minimum password length', async () => {
    const user = new User({
      name: 'Test User',
      phone: makePhone('9876543218'),
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
  }, 30000);

  test('should enforce unique phone constraint', async () => {
    const phone = makePhone('9876543219');

    const user1 = new User({
      name: 'User One',
      phone,
      password: 'password123',
      role: 'Admin'
    });
    await user1.save();

    const user2 = new User({
      name: 'User Two',
      phone,
      password: 'password456',
      role: 'Agent'
    });

    let error;
    try {
      await user2.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.code).toBe(11000);
  }, 30000);

  test('should validate phone number format (10-15 digits)', async () => {
    const user = new User({
      name: 'Test User',
      phone: { countryCode: '+91', number: '123' }, // Too short
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
    expect(error.errors['phone.number']).toBeDefined();
    expect(error.errors['phone.number'].message).toContain('10-15 digits');
  }, 30000);

  test('should validate role enum', async () => {
    const user = new User({
      name: 'Test User',
      phone: makePhone('9876543220'),
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
  }, 30000);

  test('should accept Admin as valid role', async () => {
    const user = new User({
      name: 'Test User',
      phone: makePhone('9876543221'),
      password: 'password123',
      role: 'Admin'
    });

    await user.save();
    expect(user.role).toBe('Admin');
  }, 30000);

  test('should accept Agent as valid role', async () => {
    const user = new User({
      name: 'Test User',
      phone: makePhone('9876543222'),
      password: 'password123',
      role: 'Agent'
    });

    await user.save();
    expect(user.role).toBe('Agent');
  }, 30000);
});
