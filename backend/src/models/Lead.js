const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  date: {
    type: Date,
    default: Date.now
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  number: {
    type: String,
    required: [true, 'Number is required'],
    trim: true
  },
  leadFrom: {
    type: String,
    trim: true,
    default: ''
  },
  leadSource: {
    type: String,
    enum: {
      values: ['Own User', 'Investor', 'Inquiry', 'Other'],
      message: '{VALUE} is not a valid lead source'
    },
    default: 'Own User'
  },
  remark: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: {
      values: ['CNR', 'FOLLOW_UP', 'NOT_INTERESTED', 'BOOKED', 'INVALID_NO', 'Closed'],
      message: '{VALUE} is not a valid status'
    },
    required: [true, 'Status is required'],
    default: 'CNR'
  },
  followUpDate: {
    type: Date
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  serviceType: {
    type: String,
    trim: true,
    default: ''
  },
  propertyType: {
    type: String,
    trim: true,
    default: ''
  },
  locality: {
    type: String,
    trim: true,
    default: ''
  },
  configuration: {
    type: String,
    trim: true,
    default: ''
  },
  price: {
    type: String,
    trim: true,
    default: ''
  },
  buildingName: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
