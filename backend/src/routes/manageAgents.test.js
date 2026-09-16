/**
 * Integration tests for the Admin-only Manage Agents feature.
 *
 * Exercises the real routes, real controllers, real User model (real bcrypt
 * hashing) and real auth/role middleware against an in-memory MongoDB.
 *
 * Covers:
 *  - Admin can list agents
 *  - Admin can create an Agent
 *  - Admin cannot create an Admin through this feature (role forced to Agent)
 *  - Duplicate email is rejected
 *  - Duplicate phone is rejected
 *  - Password is hashed (never stored in plaintext)
 *  - Agent can log in after being created
 *  - Agent cannot access agent-management endpoints
 *  - Admin can delete an Agent
 *  - Admin cannot delete another Admin
 *  - Admin cannot delete themselves
 *  - Deleting an Agent does NOT delete their leads
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = 'test-jwt-secret-for-manage-agents';

describe('Manage Agents - Integration Tests', () => {
  let mongoServer;
  let app;
  let User;
  let Lead;

  function tokenFor(user) {
    return jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  const agentPayload = (overrides = {}) => ({
    name: 'New Agent',
    email: 'agent@example.com',
    phone: { countryCode: '+91', number: '9876543210' },
    password: 'password123',
    confirmPassword: 'password123',
    ...overrides
  });

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    process.env.JWT_SECRET = JWT_SECRET;

    const authRoutes = require('./authRoutes');
    const errorHandler = require('../middleware/errorHandler');

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);

    User = require('../models/User');
    Lead = require('../models/Lead');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Lead.deleteMany({});
  });

  async function createAdmin() {
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      phone: { countryCode: '+91', number: '9000000000' },
      password: 'adminpass123',
      role: 'Admin'
    });
    return admin;
  }

  async function createExistingAgent() {
    return User.create({
      name: 'Existing Agent',
      email: 'existing@example.com',
      phone: { countryCode: '+91', number: '9111111111' },
      password: 'agentpass123',
      role: 'Agent'
    });
  }

  describe('GET /api/auth/manage/agents', () => {
    it('Admin can list agents (only Agent role, no passwords)', async () => {
      const admin = await createAdmin();
      await createExistingAgent();

      const res = await request(app)
        .get('/api/auth/manage/agents')
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.agents[0].role).toBe('Agent');
      expect(res.body.agents[0].password).toBeUndefined();
      // Admin should NOT appear in the managed agents list
      expect(res.body.agents.every((a) => a.role === 'Agent')).toBe(true);
    });

    it('Agent cannot access the list endpoint (403)', async () => {
      const agent = await createExistingAgent();

      const res = await request(app)
        .get('/api/auth/manage/agents')
        .set('Authorization', `Bearer ${tokenFor(agent)}`);

      expect(res.status).toBe(403);
    });

    it('Unauthenticated request is rejected (401)', async () => {
      const res = await request(app).get('/api/auth/manage/agents');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/manage/agents', () => {
    it('Admin can create an Agent and password is hashed', async () => {
      const admin = await createAdmin();

      const res = await request(app)
        .post('/api/auth/manage/agents')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send(agentPayload());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.agent.role).toBe('Agent');
      expect(res.body.agent.password).toBeUndefined();

      // Verify persisted and hashed
      const stored = await User.findById(res.body.agent._id).select('+password');
      expect(stored).toBeTruthy();
      expect(stored.password).not.toBe('password123');
      const matches = await bcrypt.compare('password123', stored.password);
      expect(matches).toBe(true);
    });

    it('Role is forced to Agent even if Admin is requested in body', async () => {
      const admin = await createAdmin();

      const res = await request(app)
        .post('/api/auth/manage/agents')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send(agentPayload({ role: 'Admin' }));

      expect(res.status).toBe(201);
      expect(res.body.agent.role).toBe('Agent');

      const stored = await User.findById(res.body.agent._id);
      expect(stored.role).toBe('Agent');
    });

    it('Created Agent can log in', async () => {
      const admin = await createAdmin();

      await request(app)
        .post('/api/auth/manage/agents')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send(agentPayload());

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'agent@example.com', password: 'password123' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
      expect(loginRes.body.user.role).toBe('Agent');
    });

    it('Duplicate email is rejected (409)', async () => {
      const admin = await createAdmin();
      await createExistingAgent();

      const res = await request(app)
        .post('/api/auth/manage/agents')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send(agentPayload({ email: 'existing@example.com', phone: { countryCode: '+91', number: '9222222222' } }));

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('Duplicate phone is rejected (409)', async () => {
      const admin = await createAdmin();
      await createExistingAgent();

      const res = await request(app)
        .post('/api/auth/manage/agents')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send(agentPayload({ email: 'unique@example.com', phone: { countryCode: '+91', number: '9111111111' } }));

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('Mismatched confirm password is rejected (400)', async () => {
      const admin = await createAdmin();

      const res = await request(app)
        .post('/api/auth/manage/agents')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send(agentPayload({ confirmPassword: 'different123' }));

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(expect.arrayContaining(['Passwords do not match']));
    });

    it('Short password is rejected (400)', async () => {
      const admin = await createAdmin();

      const res = await request(app)
        .post('/api/auth/manage/agents')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send(agentPayload({ password: 'short', confirmPassword: 'short' }));

      expect(res.status).toBe(400);
    });

    it('Agent cannot create agents (403)', async () => {
      const agent = await createExistingAgent();

      const res = await request(app)
        .post('/api/auth/manage/agents')
        .set('Authorization', `Bearer ${tokenFor(agent)}`)
        .send(agentPayload({ email: 'another@example.com', phone: { countryCode: '+91', number: '9333333333' } }));

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/auth/manage/agents/:id', () => {
    it('Admin can delete an Agent', async () => {
      const admin = await createAdmin();
      const agent = await createExistingAgent();

      const res = await request(app)
        .delete(`/api/auth/manage/agents/${agent._id}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const stillThere = await User.findById(agent._id);
      expect(stillThere).toBeNull();
    });

    it('Deleted Agent can no longer log in', async () => {
      const admin = await createAdmin();
      const agent = await createExistingAgent();

      await request(app)
        .delete(`/api/auth/manage/agents/${agent._id}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'existing@example.com', password: 'agentpass123' });

      expect(loginRes.status).toBe(401);
    });

    it('Admin cannot delete another Admin (403)', async () => {
      const admin = await createAdmin();
      const otherAdmin = await User.create({
        name: 'Other Admin',
        email: 'other-admin@example.com',
        phone: { countryCode: '+91', number: '9444444444' },
        password: 'otheradmin123',
        role: 'Admin'
      });

      const res = await request(app)
        .delete(`/api/auth/manage/agents/${otherAdmin._id}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(403);

      const stillThere = await User.findById(otherAdmin._id);
      expect(stillThere).not.toBeNull();
    });

    it('Admin cannot delete themselves (403)', async () => {
      const admin = await createAdmin();

      const res = await request(app)
        .delete(`/api/auth/manage/agents/${admin._id}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(403);

      const stillThere = await User.findById(admin._id);
      expect(stillThere).not.toBeNull();
    });

    it('Deleting an Agent does NOT delete their leads', async () => {
      const admin = await createAdmin();
      const agent = await createExistingAgent();

      // Leads created by, owned by, and assigned to the agent
      const createdLead = await Lead.create({
        user: agent._id,
        createdBy: agent._id,
        name: 'Lead A',
        number: '5551110000',
        status: 'CNR'
      });
      const assignedLead = await Lead.create({
        user: admin._id,
        createdBy: admin._id,
        name: 'Lead B',
        number: '5552220000',
        status: 'CNR',
        assignedTo: agent._id,
        assignedBy: admin._id
      });

      const res = await request(app)
        .delete(`/api/auth/manage/agents/${agent._id}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(200);

      // Both leads must still exist
      const leadA = await Lead.findById(createdLead._id);
      const leadB = await Lead.findById(assignedLead._id);
      expect(leadA).not.toBeNull();
      expect(leadB).not.toBeNull();

      // Existing ownership/assignment references are left intact (not silently altered)
      expect(leadA.createdBy.toString()).toBe(agent._id.toString());
      expect(leadB.assignedTo.toString()).toBe(agent._id.toString());

      const totalLeads = await Lead.countDocuments({});
      expect(totalLeads).toBe(2);
    });

    it('Agent cannot call delete endpoint (403)', async () => {
      const agent = await createExistingAgent();
      const target = await User.create({
        name: 'Target Agent',
        email: 'target@example.com',
        phone: { countryCode: '+91', number: '9555555555' },
        password: 'targetpass123',
        role: 'Agent'
      });

      const res = await request(app)
        .delete(`/api/auth/manage/agents/${target._id}`)
        .set('Authorization', `Bearer ${tokenFor(agent)}`);

      expect(res.status).toBe(403);

      const stillThere = await User.findById(target._id);
      expect(stillThere).not.toBeNull();
    });

    it('Invalid agent ID returns 400', async () => {
      const admin = await createAdmin();

      const res = await request(app)
        .delete('/api/auth/manage/agents/not-a-valid-id')
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(400);
    });

    it('Non-existent agent returns 404', async () => {
      const admin = await createAdmin();
      const missingId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .delete(`/api/auth/manage/agents/${missingId}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`);

      expect(res.status).toBe(404);
    });
  });
});
