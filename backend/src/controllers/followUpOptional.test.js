/**
 * Integration tests — follow-up date is optional.
 *
 * Verifies:
 *  - Creating a lead without a follow-up date succeeds
 *  - Updating a lead and clearing its follow-up date sets it to null
 *  - Leads with no follow-up date do NOT appear in pending follow-ups
 *  - Existing leads with a follow-up date continue to work
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { userId: req.headers['x-user-id'] || '507f1f77bcf86cd799439011', role: 'Admin' };
    next();
  })
}));

describe('Follow-up date – optional', () => {
  let mongoServer;
  let app;
  let Lead;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const leadRoutes = require('../routes/leadRoutes');
    const errorHandler = require('../middleware/errorHandler');

    app = express();
    app.use(express.json());
    app.use('/api/leads', leadRoutes);
    app.use(errorHandler);

    Lead = require('../models/Lead');
    require('../models/User');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Lead.deleteMany({});
  });

  it('creates a lead successfully with no follow-up date', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ name: 'Alice', number: '9876543210' });

    expect(res.status).toBe(201);
    expect(res.body.lead.followUpDate).toBeFalsy();
  });

  it('creates a lead with an empty followUpDate string', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ name: 'Bob', number: '9876543211', followUpDate: '' });

    expect(res.status).toBe(201);
    expect(res.body.lead.followUpDate).toBeFalsy();
  });

  it('creating a lead with a valid follow-up date still works', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ name: 'Carol', number: '9876543212', followUpDate: '2026-12-31' });

    expect(res.status).toBe(201);
    expect(res.body.lead.followUpDate).toBeTruthy();
  });

  it('clears follow-up date when updated to empty string', async () => {
    const lead = await Lead.create({
      user: '507f1f77bcf86cd799439011',
      createdBy: '507f1f77bcf86cd799439011',
      name: 'Dave',
      number: '9876543213',
      status: 'CNR',
      followUpDate: new Date('2026-12-31')
    });

    const res = await request(app)
      .put(`/api/leads/${lead._id}`)
      .send({
        name: 'Dave',
        number: '9876543213',
        status: 'CNR',
        followUpDate: ''
      });

    expect(res.status).toBe(200);
    const updated = await Lead.findById(lead._id);
    expect(updated.followUpDate).toBeNull();
  });

  it('leads without follow-up date do NOT appear in pending follow-ups', async () => {
    await Lead.create({
      user: '507f1f77bcf86cd799439011',
      createdBy: '507f1f77bcf86cd799439011',
      name: 'NoFollowUp',
      number: '9876543214',
      status: 'CNR'
      // no followUpDate
    });

    const res = await request(app).get('/api/leads/today');
    expect(res.status).toBe(200);
    const names = res.body.leads.map((l) => l.name);
    expect(names).not.toContain('NoFollowUp');
  });

  it('lead WITH a past follow-up date DOES appear in pending follow-ups', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await Lead.create({
      user: '507f1f77bcf86cd799439011',
      createdBy: '507f1f77bcf86cd799439011',
      name: 'HasFollowUp',
      number: '9876543215',
      status: 'CNR',
      followUpDate: yesterday
    });

    const res = await request(app).get('/api/leads/today');
    expect(res.status).toBe(200);
    const names = res.body.leads.map((l) => l.name);
    expect(names).toContain('HasFollowUp');
  });
});
