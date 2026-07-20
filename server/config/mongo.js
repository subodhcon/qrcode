import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI / MONGO_URI not set. Running database-less mode.');
}

export const connectMongo = async () => {
  if (!MONGODB_URI) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    // Do not call process.exit(1) in serverless environments
  }
};

export const mongooseInstance = mongoose;
