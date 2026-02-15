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

    const { date, name, number, remark, status, followUpDate } = req.body;

    const lead = new Lead({
      user: req.user.userId, // Automatically assign logged-in user
      date: date || Date.now(),
      name,
      number,
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
 * Get all leads (filtered by logged-in user)
 */
const getAllLeads = async (req, res, next) => {
  try {
    // Only return leads belonging to the logged-in user
    const leads = await Lead.find({ user: req.user.userId }).sort({ date: -1 });

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
 * Update a lead (only if it belongs to logged-in user)
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
    const { date, name, number, remark, status, followUpDate } = req.body;

    // Find lead and verify it belongs to the logged-in user
    const lead = await Lead.findOne({ _id: id, user: req.user.userId });

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
 * Delete a lead (only if it belongs to logged-in user)
 */
const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find and delete lead only if it belongs to the logged-in user
    const lead = await Lead.findOneAndDelete({ _id: id, user: req.user.userId });

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
 * Get today's follow-ups (filtered by logged-in user)
 */
const getTodayFollowUps = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter by both user and today's date
    const leads = await Lead.find({
      user: req.user.userId,
      followUpDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ followUpDate: 1 });

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
