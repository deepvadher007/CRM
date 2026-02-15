const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { leadValidation } = require('../utils/validators');
const {
  createLead,
  getAllLeads,
  updateLead,
  deleteLead,
  getTodayFollowUps
} = require('../controllers/leadController');

// All lead routes require authentication
router.use(verifyToken);

// GET /api/leads/today - Get today's follow-ups (must be before /:id route)
router.get('/today', getTodayFollowUps);

// POST /api/leads - Create new lead
router.post('/', leadValidation, createLead);

// GET /api/leads - Get all leads
router.get('/', getAllLeads);

// PUT /api/leads/:id - Update lead
router.put('/:id', leadValidation, updateLead);

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', deleteLead);

module.exports = router;
