// Feature: crm-lead-assignment, Property 3: Non-Admin users cannot call the assign endpoint

const request = require('supertest');
const express = require('express');
const fc = require('fast-check');
const leadRoutes = require('./leadRoutes');

// Mock verifyToken — will be overridden per test via the mock implementation
jest.mock('../middleware/auth', () => ({
  verifyToken: jest.fn((req, res, next) => next())
}));

// Mock requireRole to enforce real role-check behavior
jest.mock('../middleware/roleAuth', () => ({
  requireRole: (...allowedRoles) => (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }
    next();
  }
}));

// Mock assignLead controller so it never hits the DB
jest.mock('../controllers/leadController', () => ({
  createLead: jest.fn((req, res) => res.status(201).json({ success: true })),
  getAllLeads: jest.fn((req, res) => res.status(200).json({ success: true, leads: [] })),
  updateLead: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteLead: jest.fn((req, res) => res.status(200).json({ success: true })),
  getTodayFollowUps: jest.fn((req, res) => res.status(200).json({ success: true, leads: [] })),
  assignLead: jest.fn((req, res) => res.status(200).json({ success: true, lead: {} }))
}));

const { verifyToken } = require('../middleware/auth');

// Set up Express app with leadRoutes mounted
const app = express();
app.use(express.json());
app.use('/api/leads', leadRoutes);

describe('Lead Routes — Property 3: Non-Admin gets 403 on assign endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Property 3: Non-Admin users cannot call the assign endpoint (100 runs)', async () => {
    // Validates: Requirements 5.1, 5.5
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Agent'),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), { minLength: 1, maxLength: 40 }),
        async (role, leadId) => {
          // Mock verifyToken to inject a non-Admin user
          verifyToken.mockImplementation((req, res, next) => {
            req.user = { userId: 'user123', role };
            next();
          });

          const response = await request(app)
            .put(`/api/leads/assign/${leadId}`)
            .send({ agentId: 'someAgentId' });

          return response.status === 403;
        }
      ),
      { numRuns: 100 }
    );
  });
});
