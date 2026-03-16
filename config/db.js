const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/translate-hub';
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not set. Using the local fallback: mongodb://localhost:27017/translate-hub');
    }
    process.exit(1);
  }
};

module.exports = connectDB;
