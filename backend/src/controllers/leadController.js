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
 * Get all leads
 */
const getAllLeads = async (req, res, next) => {
  try {
    const leads = await Lead.find().sort({ date: -1 });

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
 * Update a lead
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

    const lead = await Lead.findByIdAndUpdate(
      id,
      { date, name, number, remark, status, followUpDate },
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
        statusCode: 404
      });
    }

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
 * Delete a lead
 */
const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
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
 * Get today's follow-ups
 */
const getTodayFollowUps = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const leads = await Lead.find({
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
