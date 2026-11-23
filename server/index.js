import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import mongoose from 'mongoose';
import { connectMongo } from './config/mongo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../client/dist');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP to allow Leaflet tiles and scripts to run cleanly
}));

const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim()) 
  : '*';

app.use(cors({
  origin: process.env.NODE_ENV === 'production' && process.env.CLIENT_URL ? allowedOrigins : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Logger Middleware
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Body Parser Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { QRCode as QRCodeModel } from './models/QRCode.js';
import QRCode from 'qrcode';
import { seedDefaultCategories } from './scripts/seedCategories.js';

// Serve Public Static files (QR PNG images) - Fallback for static files
app.use(express.static('public'));

// Serve client compiled build files
app.use(express.static(clientDistPath));

// Dynamic serverless fallback for serving QR code images from MongoDB in-memory
app.get('/qrcodes/:filename', async (req, res, next) => {
  const { filename } = req.params;
  const slug = filename.replace('.png', '');
  try {
    const qr = await QRCodeModel.findOne({ slug });
    if (!qr) return res.status(404).send('Not Found');
    const pngBuffer = await QRCode.toBuffer(qr.data, { width: 300, margin: 1 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.send(pngBuffer);
  } catch (error) {
    next(error);
  }
});

// Middleware to ensure DB connection is ready before handling API requests
app.use('/api', async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    await connectMongo();
  }
  next();
});

// Routing Mapping
app.use('/api', routes);

// 404 handler for unknown API routes
app.all('/api/*', (req, res) => {
  return res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`,
  });
});

// SPA routing fallback - Serve index.html for non-API frontend paths
app.get('*', (req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('API Server is running. Client build files not detected.');
    }
  });
});

// Global Error Handler
app.use(errorHandler);

// Global process-level safety nets
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection at]:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]:', error);
});

export default app;

// Database check and server initialization
connectMongo().then(async () => {
  console.log('[Database]: Connected successfully via MongoDB Atlas.');
  try {
    await seedDefaultCategories();
  } catch (seedErr) {
    console.warn('[Warning]: Auto-seeding categories failed:', seedErr.message);
  }
}).catch((error) => {
  console.warn('[Warning]: MongoDB connection failed. Running in offline/mock mode:', error.message || error);
});

// Start listening ONLY if running locally (not on Vercel and not in test mode)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Server]: Listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}
