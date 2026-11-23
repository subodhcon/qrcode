import mongoose from 'mongoose';

/**
 * Health check controller.
 * GET /api/health
 */
export const getHealth = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  const healthData = {
    status: isDbConnected,
    database: isDbConnected ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  // Return 200 if connected, 503 Service Unavailable if database is down
  return res.status(isDbConnected ? 200 : 503).json(healthData);
};
