const mongoose = require('mongoose');

/**
 * Connect to MongoDB.
 * Reads the connection string from process.env.MONGODB_URI.
 * Exits the process with a clear error if the connection fails.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000
    });
    console.log(`[DB] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[DB] MongoDB connection error: ${err.message}`);
    console.error('[DB] Check MONGODB_URI in your .env file.');
    process.exit(1);
  }
};

module.exports = connectDB;