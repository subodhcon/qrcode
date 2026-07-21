import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI / MONGO_URI not set. Running database-less mode.');
}

let isConnected = false;

export const connectMongo = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }
  if (!MONGODB_URI) return;
  try {
    const db = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
};

export const mongooseInstance = mongoose;
