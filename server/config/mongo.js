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
 * Robustly sanitize and normalize MongoDB connection URI
 * Handles:
 * - Leading/trailing spaces or BOM characters
 * - Surrounding quotes ("..." or '...')
 * - Extra text pasted after URI (e.g. "mongodb+srv://... username password")
 * - Missing scheme (e.g. user pasted "username:password@cluster0.mongodb.net" without mongodb+srv://)
 * - Missing database name
 */
export function sanitizeMongoUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return '';
  
  // 1. Remove BOM, non-printable characters and whitespace
  let uri = rawUri.replace(/^\uFEFF/, '').trim();

  // 2. Strip leading/trailing double or single quotes
  uri = uri.replace(/^["']+|["']+$/g, '').trim();

  // 3. If user pasted multiple arguments/tokens, extract the token containing the cluster or mongodb scheme
  const tokens = uri.split(/\s+/);
  const matchedToken = tokens.find(t => t.includes('.mongodb.net') || t.startsWith('mongodb'));
  if (matchedToken) {
    uri = matchedToken.trim();
  }

  // 4. If scheme is missing but has @ and cluster host
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    if (uri.includes('@') || uri.includes('.mongodb.net')) {
      uri = `mongodb+srv://${uri.replace(/^\/+/, '')}`;
    }
  }

  // 5. Ensure database name is present
  if (uri.endsWith('.mongodb.net/')) {
    uri = `${uri}qrcode_db?retryWrites=true&w=majority`;
  } else if (uri.endsWith('.mongodb.net')) {
    uri = `${uri}/qrcode_db?retryWrites=true&w=majority`;
  }

  return uri;
}

const rawUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const MONGODB_URI = sanitizeMongoUri(rawUri);

// Safe debug logging (no passwords exposed)
if (rawUri) {
  const safePrefix = MONGODB_URI.substring(0, 22);
  console.log(`[Mongo Config]: Processed URI (starts with: "${safePrefix}...", length: ${MONGODB_URI.length})`);
} else {
  console.warn('⚠️ MONGODB_URI / MONGO_URI not set. Running database-less mode.');
}

let isConnected = false;

export const connectMongo = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }
  if (!MONGODB_URI) return;
  try {
    const db = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message || err);
  }
};

export const mongooseInstance = mongoose;
