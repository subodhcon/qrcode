import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// Ensure SRV records for MongoDB Atlas resolve reliably across all OS & ISP networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in sandboxed environments where setting DNS servers is restricted
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from server directory or fallback to cwd
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

/**
 * Sanitize and normalize MongoDB connection URI
 * Handles accidental quotes, trailing spaces, or extra arguments copied from Atlas UI
 */
export function sanitizeMongoUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return '';
  let uri = rawUri.trim();

  // Strip leading/trailing double or single quotes added in dashboard paste
  uri = uri.replace(/^["']+|["']+$/g, '').trim();

  // If user pasted "mongodb+srv://... username password", extract just the URI token
  if (uri.startsWith('mongodb+srv://') || uri.startsWith('mongodb://')) {
    uri = uri.split(/\s+/)[0].trim();
  }

  // If URI ends with root slash without database name, append default database name
  if (uri.endsWith('.mongodb.net/')) {
    uri = `${uri}qrcode_db?retryWrites=true&w=majority`;
  } else if (uri.endsWith('.mongodb.net')) {
    uri = `${uri}/qrcode_db?retryWrites=true&w=majority`;
  }

  return uri;
}

const rawUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const MONGODB_URI = sanitizeMongoUri(rawUri);

if (!MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI / MONGO_URI not set. Running database-less mode.');
}

// Disable Mongoose command buffering in serverless to prevent 10000ms timeouts on cold starts
mongoose.set('bufferCommands', false);

let isConnected = false;

export const connectMongo = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }
  if (!MONGODB_URI) return;
  try {
    const db = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message || err);
  }
};

export const mongooseInstance = mongoose;
