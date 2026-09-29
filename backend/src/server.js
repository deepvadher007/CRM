/**
 * Main Server File
 * Entry point for the Hanuvansh CRM Authentication Backend API
 * 
 * Requirements: 7.1, 7.5, 8.2
 */

// Load environment variables first
require('dotenv').config();

// Import validation and configuration
const validateEnv = require('./config/validateEnv');
const { connectDB } = require('./config/db');

// Validate environment variables before starting
validateEnv();

// Import Express and middleware
const express = require('express');
const cors = require('cors');

// Import routes and error handler
const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

// Configure CORS middleware with production-safe origin checking
const allowedOrigins = [
  'https://crm.hanuvanshrealty.com',
  'http://localhost:3000',
  'http://localhost:5000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, same-origin server calls)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  // Explicitly list methods and headers so preflight responses carry the
  // required Access-Control-Allow-Methods and Access-Control-Allow-Headers
  // headers.  Without these, browsers block credentialed POST/PUT requests
  // even when the origin itself is allowed.
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Handle OPTIONS preflight requests BEFORE any auth middleware or route
// handlers.  This ensures cross-origin preflight succeeds even on protected
// routes (e.g. POST /api/auth/login sends an Authorization-less preflight,
// but PUT /api/leads/… sends one with Authorization in the request headers).
app.options('*', cors(corsOptions));

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount authentication routes
app.use('/api/auth', authRoutes);

// Mount lead routes
app.use('/api/leads', leadRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404
  });
});

// Global error handler middleware (must be last)
app.use(errorHandler);

// Get port from environment
const PORT = process.env.PORT || 5000;

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`📡 API available at: http://localhost:${PORT}`);
      console.log(`🌐 CORS enabled for: http://localhost:3000, https://crm.hanuvanshrealty.com\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export app for testing
module.exports = app;
