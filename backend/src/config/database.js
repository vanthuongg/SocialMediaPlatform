import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictPopulate', false);

/**
 * Connects to MongoDB using Mongoose.
 * Connection is cached — safe to call multiple times.
 */
export async function connectDatabase() {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}
