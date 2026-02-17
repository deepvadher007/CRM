/**
 * Email Utility
 * Handles sending emails using nodemailer
 * 
 * @module utils/sendEmail
 */

const nodemailer = require('nodemailer');

/**
 * Send email using nodemailer
 * 
 * @async
 * @function sendEmail
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email body
 * @param {string} options.html - HTML email body (optional)
 * 
 * @returns {Promise<Object>} Email send result
 * @throws {Error} If email sending fails
 * 
 * @example
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Password Reset',
 *   text: 'Click here to reset your password...',
 *   html: '<p>Click here to reset your password...</p>'
 * });
 */
const sendEmail = async (options) => {
  try {
    // Create transporter (fixed: createTransport not createTransporter)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email options
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'Hanuvansh CRM'} <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

module.exports = sendEmail;
