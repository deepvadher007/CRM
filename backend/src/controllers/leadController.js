const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Lead = require('../models/Lead');

/**
 * Create a new lead
 */
const createLead = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg),
        statusCode: 400
      });
    }

    const {
      date, name, number, leadFrom, leadSource, remark, status, followUpDate,
      requirement, budget, stage, lastContacted, temperature
    } = req.body;

    // Check for duplicate phone number
    const duplicatePhone = await Lead.findOne({ number });
    let duplicateWarning = null;

    if (duplicatePhone) {
      // Check if name also matches
      if (duplicatePhone.name.toLowerCase() === name.toLowerCase()) {
        duplicateWarning = 'STRONG: Lead with same name and phone already exists';
      } else {
        duplicateWarning = 'WEAK: Phone number already exists with different name';
      }
    }

    const lead = new Lead({
      user: req.user.userId, // Automatically assign logged-in user
      createdBy: req.user.userId, // Track who created this lead
      date: date || Date.now(),
      name,
      number,
      leadFrom,
      leadSource: leadSource || 'Own User',
      remark,
      status: status || 'CNR',
      followUpDate: followUpDate || null,
      // New real-estate fields (optional; default to empty/null when omitted)
      requirement: requirement || '',
      budget: budget || '',
      stage: stage || '',
      lastContacted: lastContacted || null,
      temperature: temperature || ''
    });

    await lead.save();

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      duplicateWarning,
      lead
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all leads (role-based filtering with search and filters)
 * Admin: sees all leads with createdBy populated
 * Agent: sees only their own leads
 * Supports query params: status, leadSource, agent (admin only), search
 */
const getAllLeads = async (req, res, next) => {
  try {
    const { status, leadSource, agent, search, stage, temperature } = req.query;
    
    // Build base query
    let query = {};
    
    // Role-based filtering
    if (req.user.role !== 'Admin') {
      // Agent sees leads they created OR leads assigned to them
      query.$or = [
        { createdBy: req.user.userId },
        { assignedTo: req.user.userId }
      ];
    } else if (agent) {
      // Admin can filter by agent
      query.user = agent;
    }
    
    // Status filter
    if (status) {
      query.status = status;
    }
    
    // Lead source filter
    if (leadSource) {
      query.leadSource = leadSource;
    }

    // Stage filter (new)
    if (stage) {
      query.stage = stage;
    }

    // Temperature filter (new)
    if (temperature) {
      query.temperature = temperature;
    }
    
    // Search by name or phone (case insensitive)
    // Use $and to combine with existing $or (role-based filter)
    if (search) {
      const searchCondition = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { number: { $regex: search, $options: 'i' } }
        ]
      };
      if (query.$or) {
        // Agent already has a role-based $or, use $and to combine
        query.$and = [{ $or: query.$or }, searchCondition];
        delete query.$or;
      } else {
        // Admin: just set $or directly
        query.$or = searchCondition.$or;
      }
    }
    
    let leads;
    if (req.user.role === 'Admin') {
      // Admin sees all leads with creator information
      leads = await Lead.find(query)
        .populate('createdBy', 'name role')
        .populate('assignedTo', 'name')
        .populate('assignedBy', 'name')
        .sort({ date: -1 });
    } else {
      // Agent sees only leads assigned to them
      leads = await Lead.find(query)
        .populate('assignedBy', 'name')
        .sort({ date: -1 });
    }

    res.status(200).json({
      success: true,
      count: leads.length,
      leads
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a lead (role-based permission check)
 * Admin: can update any lead
 * Agent: can only update their own leads
 */
const updateLead = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => err.msg),
        statusCode: 400
      });
    }

    const { id } = req.params;
    const {
      date, name, number, leadFrom, leadSource, remark, status, followUpDate,
      requirement, budget, stage, lastContacted, temperature
    } = req.body;

    // Find lead with role-based filtering
    let lead;
    if (req.user.role === 'Admin') {
      lead = await Lead.findById(id);
    } else {
      lead = await Lead.findOne({
        _id: id,
        $or: [{ createdBy: req.user.userId }, { assignedTo: req.user.userId }]
      });
    }

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or you do not have permission to update it',
        statusCode: 404
      });
    }

    // Update the lead
    lead.date = date;
    lead.name = name;
    lead.number = number;
    lead.leadFrom = leadFrom;
    lead.leadSource = leadSource;
    lead.remark = remark;
    lead.status = status;
    // Follow-up date is optional. An empty string or null means "clear it".
    lead.followUpDate = followUpDate || null;

    // Update new real-estate fields only when provided, so unrelated fields on
    // existing leads are never accidentally overwritten with undefined.
    if (requirement !== undefined) lead.requirement = requirement;
    if (budget !== undefined) lead.budget = budget;
    if (stage !== undefined) lead.stage = stage;
    if (lastContacted !== undefined) lead.lastContacted = lastContacted || null;
    if (temperature !== undefined) lead.temperature = temperature;

    await lead.save();

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      lead
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a lead (role-based permission check)
 * Admin: can delete any lead
 * Agent: can only delete their own leads
 */
const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find and delete lead with role-based filtering
    let lead;
    if (req.user.role === 'Admin') {
      lead = await Lead.findByIdAndDelete(id);
    } else {
      lead = await Lead.findOneAndDelete({
        _id: id,
        $or: [{ createdBy: req.user.userId }, { assignedTo: req.user.userId }]
      });
    }

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or you do not have permission to delete it',
        statusCode: 404
      });
    }

    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending follow-ups (role-based filtering)
 * Shows leads where followUpDate <= today AND status != 'Closed'
 * Admin: sees all pending follow-ups
 * Agent: sees only their own follow-ups
 */
const getTodayFollowUps = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    let query = {
      followUpDate: { $lte: today },
      status: { $ne: 'Closed' }
    };
    
    // Role-based filtering
    if (req.user.role !== 'Admin') {
      query.$or = [
        { createdBy: req.user.userId },
        { assignedTo: req.user.userId }
      ];
    }

    const leads = await Lead.find(query)
      .populate('createdBy', 'name role')
      .sort({ followUpDate: 1 });

    res.status(200).json({
      success: true,
      count: leads.length,
      leads
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign a lead to an agent (Admin only, enforced at route level)
 * PUT /api/leads/assign/:leadId
 */
const assignLead = async (req, res, next) => {
  try {
    const { leadId } = req.params;

    if (!('agentId' in req.body)) {
      return res.status(400).json({
        success: false,
        message: 'agentId is required in request body'
      });
    }

    if (!mongoose.isValidObjectId(leadId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead ID'
      });
    }

    const lead = await Lead.findById(leadId);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    lead.assignedTo = req.body.agentId;
    lead.assignedBy = req.body.agentId ? req.user.userId : null;
    await lead.save();

    res.status(200).json({
      success: true,
      message: 'Lead assigned successfully',
      lead
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLead,
  getAllLeads,
  updateLead,
  deleteLead,
  getTodayFollowUps,
  assignLead
};
