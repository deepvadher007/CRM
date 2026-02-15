const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to MongoDB database with retry logic
 * Uses mongodb-memory-server in development for easier setup
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const useMemoryServer = isDevelopment && process.env.USE_MEMORY_DB !== 'false';

  let mongoUri = process.env.MONGODB_URI;

  // Use in-memory MongoDB for development if enabled
  if (useMemoryServer) {
    console.log('Starting MongoDB Memory Server for development...');
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    console.log('MongoDB Memory Server started');
  }

  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds
  let retryCount = 0;

  const attemptConnection = async () => {
    try {
      const conn = await mongoose.connect(mongoUri, {
        // Mongoose 6+ no longer needs useNewUrlParser and useUnifiedTopology
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      });

      console.log(`MongoDB Connected: ${conn.connection.host}`);
      console.log(`Database Name: ${conn.connection.name}`);
      if (useMemoryServer) {
        console.log('Using in-memory database for development');
      }
      
      // Handle connection events
      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected successfully');
      });

    } catch (error) {
      retryCount++;
      console.error(`MongoDB connection attempt ${retryCount} failed:`, error.message);

      if (retryCount < maxRetries) {
        console.log(`Retrying connection in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptConnection();
      } else {
        console.error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
        throw new Error(`Database connection failed: ${error.message}`);
      }
    }
  };

  await attemptConnection();
};

/**
 * Disconnect from MongoDB and stop memory server if running
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    console.log('MongoDB Memory Server stopped');
  }
};

module.exports = { connectDB, disconnectDB };
