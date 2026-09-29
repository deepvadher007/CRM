/**
 * Integration test — import rejects files that don't follow the CRM format.
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const XLSX = require('xlsx');

jest.mock('../middleware/auth', () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { userId: '507f1f77bcf86cd799439011', role: 'Admin' };
    next();
  })
}));

function bufferFromRows(rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

describe('Import header validation', () => {
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

  it('rejects a file missing the required official headers with a clear error', async () => {
    const buffer = bufferFromRows([{ 'Wrong Column A': 'x', 'Random': 'y' }]);

    const res = await request(app)
      .post('/api/leads/import')
      .attach('file', buffer, 'bad.xlsx');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/CRM Excel format/i);
  });

  it('accepts a file with the official headers (Lead Name + Lead Phone Number)', async () => {
    const buffer = bufferFromRows([
      {
        'Service Type': 'Rent',
        'Property Type': 'Apartment',
        'Lead Date': '07/07/2026',
        'Lead Name': 'Housing User',
        'Lead Phone Number': '(+91)-7600331516',
        'Locality': 'Bopal',
        'Configuration': '3 BHK',
        'Price': '32.0k',
        'Building/Project Name': 'Serenity Satyam',
        'Address': 'South Bopal',
        'Notes': 'CNR 18/07'
      }
    ]);

    const res = await request(app)
      .post('/api/leads/import')
      .attach('file', buffer, 'good.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);

    // Verify the imported lead has the correct date and normalized phone
    const lead = await Lead.findOne({ name: 'Housing User' });
    expect(lead).toBeTruthy();
    expect(lead.number).toBe('7600331516');
    expect(lead.date.getUTCFullYear()).toBe(2026);
    expect(lead.date.getUTCMonth()).toBe(6); // July
    expect(lead.date.getUTCDate()).toBe(7);
    expect(lead.serviceType).toBe('Rent');
    expect(lead.remark).toBe('CNR 18/07');
  });
});
