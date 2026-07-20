import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { connectMongo } from './config/mongo.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
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

// Serve Public Static files (QR PNG images)
app.use(express.static('public'));

// Routing Mapping
app.use('/api', routes);

// Route Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// Database check and server initialization
const startServer = async () => {
  try {
    await connectMongo();
    console.log('[Database]: Connected successfully via MongoDB Atlas.');
  } catch (error) {
    console.warn('[Warning]: MongoDB connection failed. Running in offline/mock mode:', error.message || error);
  }


  app.listen(PORT, () => {
    console.log(`[Server]: Listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
};

startServer();
