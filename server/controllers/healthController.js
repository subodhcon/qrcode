import mongoose from 'mongoose';

/**
 * Health check controller.
 * GET /api/health
 */
export const getHealth = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  const healthData = {
    status: isDbConnected,
    database: isDbConnected ? 'connected' : 'connecting',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    atlasCluster: 'cluster0.29hl5du.mongodb.net'
  };

  return res.status(200).json(healthData);
};
