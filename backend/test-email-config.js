/**
 * Email Configuration Test Script
 * Run this to verify SMTP settings before deployment
 * 
 * Usage: node test-email-config.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConfig() {
  console.log('Testing Email Configuration...\n');

  // Check environment variables
  console.log('Environment Variables:');
  console.log('EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
  console.log('EMAIL_PORT:', process.env.EMAIL_PORT || 'NOT SET');
  console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***SET***' : 'NOT SET');
  console.log('EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME || 'NOT SET');
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
  console.log('');

  // Check for missing variables
  const required = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
  const missing = required.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required variables:', missing.join(', '));
    console.log('\nPlease set these in your .env file');
    process.exit(1);
  }

  // Create transporter with production configuration
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false, // must be false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Verify connection
  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');
    console.log('Configuration is correct and ready for production.');
    console.log('\nYou can now deploy to Render with these settings.');
  } catch (error) {
    console.error('❌ SMTP verification failed:', error.message);
    console.log('\nCommon issues:');
    console.log('1. Check EMAIL_USER is correct (e.g., your-email@gmail.com)');
    console.log('2. Check EMAIL_PASS is an App Password (not your regular password)');
    console.log('3. Generate App Password: https://myaccount.google.com/apppasswords');
    console.log('4. Ensure 2FA is enabled on your Google account');
    console.log('5. Check EMAIL_HOST is smtp.gmail.com');
    console.log('6. Check EMAIL_PORT is 587');
    process.exit(1);
  }
}

testEmailConfig();
