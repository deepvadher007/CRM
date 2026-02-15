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

    const { date, name, number, leadFrom, remark, status, followUpDate } = req.body;

    const lead = new Lead({
      user: req.user.userId, // Automatically assign logged-in user
      createdBy: req.user.userId, // Track who created this lead
      date: date || Date.now(),
      name,
      number,
      leadFrom,
      remark,
      status: status || 'CNR',
      followUpDate
    });

    await lead.save();

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      lead
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all leads (role-based filtering)
 * Admin: sees all leads with createdBy populated
 * Agent: sees only their own leads
 */
const getAllLeads = async (req, res, next) => {
  try {
    let leads;
    
    if (req.user.role === 'Admin') {
      // Admin sees all leads with creator information
      leads = await Lead.find({})
        .populate('createdBy', 'name role')
        .sort({ date: -1 });
    } else {
      // Agent sees only their own leads
      leads = await Lead.find({ user: req.user.userId }).sort({ date: -1 });
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
    const { date, name, number, leadFrom, remark, status, followUpDate } = req.body;

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
 * Get today's follow-ups (role-based filtering)
 * Admin: sees all today's follow-ups
 * Agent: sees only their own follow-ups
 */
const getTodayFollowUps = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let leads;
    
    if (req.user.role === 'Admin') {
      // Admin sees all today's follow-ups
      leads = await Lead.find({
        followUpDate: {
          $gte: today,
          $lt: tomorrow
        }
      }).sort({ followUpDate: 1 });
    } else {
      // Agent sees only their own follow-ups
      leads = await Lead.find({
        user: req.user.userId,
        followUpDate: {
          $gte: today,
          $lt: tomorrow
        }
      }).sort({ followUpDate: 1 });
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

module.exports = {
  createLead,
  getAllLeads,
  updateLead,
  deleteLead,
  getTodayFollowUps
};
