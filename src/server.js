require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const { startWatchers, stopWatchers } = require('./services/changeStreamWatcher');

// Route imports
const cargoRoutes = require('./routes/cargoRoutes');
const personnelRoutes = require('./routes/personnelRoutes');
const sosRoutes = require('./routes/sosRoutes');
const syncRoutes = require('./routes/syncRoutes');
const healthRoutes = require('./routes/healthRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Root greeting & system metadata
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      system: 'PolarLink Expedition Logistics',
      node: 'Station Master Node',
      version: '1.0.0',
      status: 'OPERATIONAL',
      mode: 'Offline-First',
      endpoints: {
        health: '/api/health',
        dashboard: '/api/dashboard/stats',
        cargo: '/api/cargo',
        personnel: '/api/personnel',
        sos: '/api/sos',
        sync: '/api/sync',
      },
    },
  });
});

// Mount API routes
app.use('/api/cargo', cargoRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Catch 404 for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl} - Route not found on Station Master Node`,
  });
});

// Global Error Handler
app.use(errorHandler);

let serverInstance = null;

// Start server function
async function startServer() {
  try {
    await connectDB();

    // Start MongoDB change stream watchers for offline sync
    startWatchers();

    serverInstance = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`❄️  POLARLINK STATION MASTER NODE IS ONLINE  ❄️`);
      console.log(`📡  Listening on port: ${PORT}`);
      console.log(`🧭  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📊  Dashboard Stats: http://localhost:${PORT}/api/dashboard/stats`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start PolarLink Station Master Node:', err.message);
    process.exit(1);
  }
}

// Graceful shutdown handling
const shutdown = async () => {
  console.log('\n[SHUTDOWN] Station Master Node stopping gracefully...');
  await stopWatchers();
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('[SHUTDOWN] HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Run directly if invoked via node
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
