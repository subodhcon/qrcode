import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
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
app.use(cors({
  origin: '*', // Customize this as per production requirements
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logger Middleware
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Body Parser Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { QRCode as QRCodeModel } from './models/QRCode.js';
import QRCode from 'qrcode';

// Serve Public Static files (QR PNG images) - Fallback for static files
app.use(express.static('public'));

// Serve client compiled build files
app.use(express.static(clientDistPath));

// Dynamic serverless fallback for serving QR code images from MongoDB in-memory
app.get('/qrcodes/:filename', async (req, res) => {
  const { filename } = req.params;
  const slug = filename.replace('.png', '');
  try {
    const qr = await QRCodeModel.findOne({ slug });
    if (!qr) return res.status(404).send('Not Found');
    const pngBuffer = await QRCode.toBuffer(qr.data, { width: 300, margin: 1 });
    res.setHeader('Content-Type', 'image/png');
    return res.send(pngBuffer);
  } catch (error) {
    return res.status(500).send('Error generating image');
  }
});

// Middleware to ensure DB connection is ready before handling API requests
app.use('/api', async (req, res, next) => {
  await connectMongo();
  next();
});

// Routing Mapping
app.use('/api', routes);

// SPA routing fallback - Serve index.html for non-API frontend paths
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Global Error Handler
app.use(errorHandler);

export default app;

// Database check and server initialization
connectMongo().then(() => {
  console.log('[Database]: Connected successfully via MongoDB Atlas.');
}).catch((error) => {
  console.warn('[Warning]: MongoDB connection failed. Running in offline/mock mode:', error.message || error);
});

// Start listening ONLY if running locally (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Server]: Listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}
