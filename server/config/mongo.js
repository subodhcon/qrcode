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
 * - Mangled schemes (e.g. missing 'm' in "ongodb+srv://")
 * - Duplicated schemes (e.g. "mongodb+srv://ongodb+srv://")
 * - Surrounding quotes ("..." or '...')
 * - Extra text pasted after URI (e.g. "mongodb+srv://... username password")
 * - Missing database name
 */
export function sanitizeMongoUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return '';
  
  // 1. Remove BOM, non-printable characters and whitespace
  let uri = rawUri.replace(/^\uFEFF/, '').trim();

  // 2. Strip leading/trailing double or single quotes
  uri = uri.replace(/^["']+|["']+$/g, '').trim();

  // 3. If multiple tokens, extract the token containing the cluster host
  const tokens = uri.split(/\s+/);
  const matchedToken = tokens.find(t => t.includes('.mongodb.net')) || tokens[0];
  if (matchedToken) {
    uri = matchedToken.trim();
  }

  // 4. Strip any mangled or duplicated schemes (e.g. ongodb+srv:// or mongodb+srv://ongodb+srv://)
  while (uri.match(/^(?:mongodb(?:\+srv)?:\/\/|m?ongodb(?:\+srv)?:\/\/)/i)) {
    uri = uri.replace(/^(?:mongodb(?:\+srv)?:\/\/|m?ongodb(?:\+srv)?:\/\/)/i, '');
  }

  // 5. Prepend canonical scheme
  uri = `mongodb+srv://${uri.replace(/^\/+/, '')}`;

  // 6. Ensure database name is present
  if (uri.endsWith('.mongodb.net/')) {
    uri = `${uri}qrcode_db?retryWrites=true&w=majority`;
  } else if (uri.endsWith('.mongodb.net')) {
    uri = `${uri}/qrcode_db?retryWrites=true&w=majority`;
  }

  return uri;
}

const FALLBACK_ATLAS_URI = 'mongodb+srv://subodhconfluxaa_db_user:t7BHcOhsGs8jY8OK@cluster0.29hl5du.mongodb.net/qrcode_db?retryWrites=true&w=majority';

const rawUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
let MONGODB_URI = sanitizeMongoUri(rawUri);

// If sanitized URI is invalid, fallback to verified Atlas cluster
if (!MONGODB_URI || (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://'))) {
  console.warn('⚠️ MONGODB_URI invalid or missing. Using verified Atlas fallback cluster.');
  MONGODB_URI = FALLBACK_ATLAS_URI;
}

// Debug logging (no passwords exposed)
const safePrefix = MONGODB_URI.substring(0, 22);
console.log(`[Mongo Config]: Processed URI (starts with: "${safePrefix}...", length: ${MONGODB_URI.length})`);

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
