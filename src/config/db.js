const mongoose = require('mongoose');

/**
 * Connect to MongoDB with connection events and replica set handling
 */
const connectDB = async () => {
  let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/polarlink';

  // Ensure database name is included for MongoDB Atlas URIs
  if (mongoUri.startsWith('mongodb+srv://') && !mongoUri.includes('.net/')) {
    mongoUri = mongoUri.replace('.net', '.net/polarlink');
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[DATABASE] MongoDB Connected successfully: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);

    // If connected to MongoDB Atlas, replica set and change streams are enabled by default
    if (mongoUri.includes('mongodb.net') || mongoUri.startsWith('mongodb+srv://')) {
      console.log('[DATABASE] Connected to MongoDB Atlas Cloud Cluster (Replica Set & Change Streams active)');
      return conn;
    }

    // Check local replica set status for MongoDB Change Streams
    try {
      const adminDb = conn.connection.db.admin();
      const status = await adminDb.command({ replSetGetStatus: 1 });
      console.log(`[DATABASE] Replica Set active: '${status.set}', state: ${status.myState}`);
    } catch (rsErr) {
      if (rsErr.code === 94 || rsErr.codeName === 'NotYetInitialized') {
        console.log('[DATABASE] Replica Set not initialized. Attempting auto-initialization...');
        try {
          const adminDb = conn.connection.db.admin();
          await adminDb.command({
            replSetInitiate: {
              _id: 'rs0',
              members: [{ _id: 0, host: `${conn.connection.host}:${conn.connection.port}` }],
            },
          });
          console.log('[DATABASE] Replica set rs0 successfully initiated!');
        } catch (initErr) {
          console.warn('[DATABASE] Auto-initiation of replica set skipped:', initErr.message);
        }
      } else {
        console.log('[DATABASE] Running in standalone mode (replica set not enabled). Change Streams require replica set mode.');
      }
    }

    return conn;
  } catch (err) {
    console.error(`[DATABASE ERROR] MongoDB Connection Failed: ${err.message}`);
    throw err;
  }
};

module.exports = connectDB;
