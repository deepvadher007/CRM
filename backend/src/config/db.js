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
  const useMemoryServer = isDevelopment && process.env.USE_MEMORY_DB === 'true';

  // Use MONGODB_URI from environment (no hardcoded fallback)
  let mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  // Use in-memory MongoDB for development if explicitly enabled
  if (useMemoryServer) {
    console.log('Starting MongoDB Memory Server for development...');
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    console.log('MongoDB Memory Server started');
  }

  // Determine if using local or Atlas
  const isLocalMongo = mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost');
  const isAtlas = mongoUri.includes('mongodb+srv') || mongoUri.includes('mongodb.net');

  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds
  let retryCount = 0;

  const attemptConnection = async () => {
    try {
      const conn = await mongoose.connect(mongoUri, {
        // Mongoose 6+ no longer needs useNewUrlParser and useUnifiedTopology
        serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
      });

      // Clear, descriptive connection message
      if (isLocalMongo) {
        console.log(`✅ MongoDB Connected: Local Database (${conn.connection.host})`);
      } else if (isAtlas) {
        console.log(`✅ MongoDB Connected: Atlas Cluster (${conn.connection.host})`);
      } else {
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      }
      
      console.log(`📊 Database Name: ${conn.connection.name}`);
      
      if (useMemoryServer) {
        console.log('🧪 Using in-memory database for testing');
      }
      
      // Handle connection events
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected successfully');
      });

    } catch (error) {
      retryCount++;
      console.error(`❌ MongoDB connection attempt ${retryCount}/${maxRetries} failed:`, error.message);

      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying connection in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptConnection();
      } else {
        console.error(`\n❌ FATAL ERROR: Failed to connect to MongoDB after ${maxRetries} attempts`);
        console.error(`📍 Connection URI: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
        console.error(`\n💡 Possible solutions:`);
        
        if (isLocalMongo) {
          console.error(`   1. Ensure MongoDB is installed and running locally`);
          console.error(`   2. Start MongoDB service:`);
          console.error(`      - Windows: net start MongoDB`);
          console.error(`      - Mac: brew services start mongodb-community`);
          console.error(`      - Linux: sudo systemctl start mongod`);
          console.error(`   3. Verify MongoDB is listening on port 27017`);
        } else if (isAtlas) {
          console.error(`   1. Check your internet connection`);
          console.error(`   2. Verify MONGODB_URI credentials in .env file`);
          console.error(`   3. Check MongoDB Atlas IP whitelist`);
          console.error(`   4. Verify cluster is running in Atlas dashboard`);
        } else {
          console.error(`   1. Verify MONGODB_URI in .env file`);
          console.error(`   2. Check network connectivity`);
          console.error(`   3. Ensure MongoDB server is accessible`);
        }
        
        console.error(`\n`);
        throw new Error(`Database connection failed after ${maxRetries} attempts: ${error.message}`);
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
