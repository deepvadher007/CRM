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

    const { date, name, number, leadFrom, leadSource, remark, status, followUpDate } = req.body;

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
      followUpDate
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
    const { status, leadSource, agent, search } = req.query;
    
    // Build base query
    let query = {};
    
    // Role-based filtering
    if (req.user.role !== 'Admin') {
      query.user = req.user.userId;
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
    
    // Search by name or phone (case insensitive)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { number: { $regex: search, $options: 'i' } }
      ];
    }
    
    let leads;
    if (req.user.role === 'Admin') {
      // Admin sees all leads with creator information
      leads = await Lead.find(query)
        .populate('createdBy', 'name role')
        .sort({ date: -1 });
    } else {
      // Agent sees only their own leads
      leads = await Lead.find(query).sort({ date: -1 });
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
    const { date, name, number, leadFrom, leadSource, remark, status, followUpDate } = req.body;

    // Find lead with role-based filtering
    let lead;
    if (req.user.role === 'Admin') {
      lead = await Lead.findById(id);
    } else {
      lead = await Lead.findOne({ _id: id, user: req.user.userId });
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
    lead.followUpDate = followUpDate;

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
      lead = await Lead.findOneAndDelete({ _id: id, user: req.user.userId });
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
      query.user = req.user.userId;
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

module.exports = {
  createLead,
  getAllLeads,
  updateLead,
  deleteLead,
  getTodayFollowUps
};
