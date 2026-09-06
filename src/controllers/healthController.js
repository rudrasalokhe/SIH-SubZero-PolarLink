const mongoose = require('mongoose');

/**
 * @desc Get server and database health status
 * @route GET /api/health
 */
const getHealth = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const isDbHealthy = dbState === 1;

  res.status(isDbHealthy ? 200 : 503).json({
    success: isDbHealthy,
    data: {
      status: isDbHealthy ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'Station Master Node',
      database: {
        status: dbStatusMap[dbState] || 'unknown',
        readyState: dbState,
        name: mongoose.connection.name || 'polarlink',
      },
    },
  });
};

module.exports = {
  getHealth,
};
