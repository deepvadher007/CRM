const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  phone: {
    countryCode: {
      type: String,
      required: [true, 'Country code is required'],
      default: '+91'
    },
    number: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\d{10,15}$/, 'Phone number must be 10-15 digits']
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // Allows null/undefined but enforces uniqueness when present
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  role: {
    type: String,
    enum: {
      values: ['Admin', 'Agent'],
      message: '{VALUE} is not a valid role'
    },
    required: [true, 'Role is required']
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpire: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create unique compound index on phone (countryCode + number)
userSchema.index({ 'phone.countryCode': 1, 'phone.number': 1 }, { unique: true });

// Create unique index on email (sparse allows null but enforces uniqueness when present)
userSchema.index({ email: 1 }, { unique: true, sparse: true });

// Pre-save hook to hash password before saving to database
userSchema.pre('save', async function() {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return;
  }

  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare password with hashed password
userSchema.methods.comparePassword = async function(candidatePassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
