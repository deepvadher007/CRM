/**
 * Integration tests for the 5 real-estate lead fields
 * (requirement, budget, stage, lastContacted, temperature).
 *
 * Uses an in-memory MongoDB and the real Lead model + lead controller through
 * the real lead routes. verifyToken is mocked to inject an Admin user.
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Inject an Admin user for all requests
jest.mock('../middleware/auth', () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { userId: req.headers['x-user-id'] || '507f1f77bcf86cd799439011', role: 'Admin' };
    next();
  })
}));

describe('Lead real-estate fields - Integration', () => {
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
    require('../models/User'); // must be registered for Lead's populate() to work
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Lead.deleteMany({});
  });

  it('creates a lead WITH the 5 fields and persists them', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({
        name: 'Alice',
        number: '9876543210',
        requirement: '3 BHK',
        budget: '₹2Cr',
        stage: 'Site Visit',
        lastContacted: '2026-09-05',
        temperature: 'Hot'
      });

    expect(res.status).toBe(201);
    expect(res.body.lead.requirement).toBe('3 BHK');
    expect(res.body.lead.budget).toBe('₹2Cr');
    expect(res.body.lead.stage).toBe('Site Visit');
    expect(res.body.lead.temperature).toBe('Hot');
    expect(new Date(res.body.lead.lastContacted).toISOString()).toContain('2026-09-05');
  });

  it('creates a lead WITHOUT the 5 fields (backward compatible defaults)', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ name: 'Bob', number: '9876500000' });

    expect(res.status).toBe(201);
    expect(res.body.lead.requirement).toBe('');
    expect(res.body.lead.budget).toBe('');
    expect(res.body.lead.stage).toBe('');
    expect(res.body.lead.lastContacted).toBeNull();
    expect(res.body.lead.temperature).toBe('');
  });

  it('updates the 5 fields without overwriting unrelated fields', async () => {
    const created = await Lead.create({
      user: '507f1f77bcf86cd799439011',
      createdBy: '507f1f77bcf86cd799439011',
      name: 'Carol',
      number: '9876511111',
      status: 'CNR',
      remark: 'keep me'
    });

    const res = await request(app)
      .put(`/api/leads/${created._id}`)
      .send({
        name: 'Carol',
        number: '9876511111',
        status: 'CNR',
        remark: 'keep me',
        requirement: '2 BHK',
        budget: '₹80L',
        stage: 'Negotiation',
        lastContacted: '2026-09-10',
        temperature: 'Warm'
      });

    expect(res.status).toBe(200);
    const updated = await Lead.findById(created._id);
    expect(updated.requirement).toBe('2 BHK');
    expect(updated.budget).toBe('₹80L');
    expect(updated.stage).toBe('Negotiation');
    expect(updated.temperature).toBe('Warm');
    expect(updated.remark).toBe('keep me'); // unrelated field preserved
  });

  it('returns the 5 fields when fetching leads', async () => {
    await Lead.create({
      user: '507f1f77bcf86cd799439011',
      createdBy: '507f1f77bcf86cd799439011',
      name: 'Dave',
      number: '9876522222',
      status: 'CNR',
      requirement: 'Commercial',
      budget: '₹5Cr',
      stage: 'New',
      temperature: 'Cold'
    });

    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(200);
    const lead = res.body.leads.find((l) => l.name === 'Dave');
    expect(lead.requirement).toBe('Commercial');
    expect(lead.budget).toBe('₹5Cr');
    expect(lead.stage).toBe('New');
    expect(lead.temperature).toBe('Cold');
  });

  it('legacy lead saved without the fields still loads (defaults applied)', async () => {
    // Simulate a legacy document by inserting directly without the new fields
    await Lead.collection.insertOne({
      user: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Legacy',
      number: '9876533333',
      status: 'CNR',
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(200);
    const legacy = res.body.leads.find((l) => l.name === 'Legacy');
    expect(legacy).toBeTruthy();
    // Missing fields simply come back undefined/empty; the lead still loads.
    expect(legacy.requirement === undefined || legacy.requirement === '').toBe(true);
  });

  it('filters leads by stage and temperature', async () => {
    await Lead.create([
      { user: '507f1f77bcf86cd799439011', createdBy: '507f1f77bcf86cd799439011', name: 'H1', number: '9000000001', status: 'CNR', stage: 'New', temperature: 'Hot' },
      { user: '507f1f77bcf86cd799439011', createdBy: '507f1f77bcf86cd799439011', name: 'C1', number: '9000000002', status: 'CNR', stage: 'Closed', temperature: 'Cold' }
    ]);

    const byStage = await request(app).get('/api/leads?stage=Closed');
    expect(byStage.body.leads.every((l) => l.stage === 'Closed')).toBe(true);
    expect(byStage.body.leads.some((l) => l.name === 'C1')).toBe(true);

    const byTemp = await request(app).get('/api/leads?temperature=Hot');
    expect(byTemp.body.leads.every((l) => l.temperature === 'Hot')).toBe(true);
    expect(byTemp.body.leads.some((l) => l.name === 'H1')).toBe(true);
  });
});
