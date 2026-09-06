/**
 * One-time bootstrap: creates the first HQ admin user.
 * Run once, then delete this file.
 *
 * Usage: node src/bootstrapAdmin.js
 *
 * After this, the admin can log in and promote other users via the HQ portal.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const connectDB = require('./config/db');
const Personnel = require('./models/Personnel');
const { hashPassword } = require('./utils/auth');

const ADMIN_EMAIL = process.argv[2] || 'admin@polarlink.com';
const ADMIN_PASSWORD = process.argv[3] || 'admin123';
const ADMIN_NAME = process.argv[4] || 'HQ Administrator';

async function bootstrap() {
  console.log('[BOOTSTRAP] Connecting to MongoDB...');
  await connectDB();

  try {
    // Check if an hq_admin already exists
    const existing = await Personnel.findOne({ role: 'hq_admin', _deleted: false });
    if (existing) {
      console.log(`[BOOTSTRAP] An HQ admin already exists: ${existing.email} (${existing.name})`);
      console.log('[BOOTSTRAP] No action taken. Exiting.');
      await mongoose.connection.close();
      process.exit(0);
    }

    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    const personnelId = `pers-hq-admin-${uuidv4().substring(0, 8)}`;

    await Personnel.create({
      personnelId,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase().trim(),
      passwordHash,
      role: 'hq_admin',
      medicalClearance: {
        status: 'cleared',
        lastCheckupDate: new Date(),
        conditions: [],
        bloodGroup: 'N/A',
      },
      currentLocation: {
        stationId: 'hq-mainland-goa',
        lastCheckIn: new Date(),
      },
      emergencyContact: {
        name: 'NCPOR Office',
        relation: 'Organization',
        phone: '+91-832-2525500',
      },
      sosStatus: 'safe',
      _synced: true,
      _lastModified: new Date(),
      _deleted: false,
    });

    console.log('========================================================');
    console.log('✅  FIRST HQ ADMIN CREATED SUCCESSFULLY');
    console.log(`📧  Email:    ${ADMIN_EMAIL}`);
    console.log(`🔑  Password: ${ADMIN_PASSWORD}`);
    console.log(`👤  Name:     ${ADMIN_NAME}`);
    console.log(`🆔  ID:       ${personnelId}`);
    console.log('');
    console.log('You can now log in at /login and access the HQ portal.');
    console.log('Change the password after first login (not yet implemented).');
    console.log('========================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[BOOTSTRAP ERROR]', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

bootstrap();
