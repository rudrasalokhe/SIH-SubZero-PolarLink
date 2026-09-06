const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const { app } = require('../src/server');
const { startWatchers, stopWatchers } = require('../src/services/changeStreamWatcher');
const Cargo = require('../src/models/Cargo');
const Personnel = require('../src/models/Personnel');
const SOSAlert = require('../src/models/SOSAlert');
const SyncLog = require('../src/models/SyncLog');
const { seedCargoData, seedPersonnelData } = require('../src/seed');
const { generateToken, hashPassword } = require('../src/utils/auth');

let replSet;
let commanderToken;
let scientistToken;
let medicToken;
let logisticsToken;
let adminToken;

describe('PolarLink Station Master Node Backend Tests with RBAC', () => {
  before(async () => {
    require('dotenv').config();

    let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (mongoUri && (mongoUri.includes('mongodb.net') || mongoUri.startsWith('mongodb+srv://'))) {
      // Connect to Atlas isolated test database
      mongoUri = mongoUri.replace('/polarlink', '/polarlink_test');
      console.log('[TEST] Connecting to Atlas test database (polarlink_test)...');
      await mongoose.connect(mongoUri);
    } else {
      // Spin up in-memory replica set
      replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
      await replSet.waitUntilRunning();
      mongoUri = replSet.getUri();
      await mongoose.connect(mongoUri, { directConnection: true });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Clean test db collections
    await Cargo.deleteMany({});
    await Personnel.deleteMany({});
    await SOSAlert.deleteMany({});
    await SyncLog.deleteMany({});

    // Seed test personnel
    await Personnel.insertMany(seedPersonnelData);

    // Generate JWT tokens for test roles
    const commanderDoc = seedPersonnelData.find((p) => p.role === 'commander');
    const scientistDoc = seedPersonnelData.find((p) => p.role === 'scientist');
    const medicDoc = seedPersonnelData.find((p) => p.role === 'medic');
    const logisticsDoc = seedPersonnelData.find((p) => p.role === 'logistics');
    const adminDoc = seedPersonnelData.find((p) => p.role === 'hq_admin');

    commanderToken = generateToken(commanderDoc);
    scientistToken = generateToken(scientistDoc);
    medicToken = generateToken(medicDoc);
    logisticsToken = generateToken(logisticsDoc);
    adminToken = generateToken(adminDoc);

    // Initialize change stream watchers
    startWatchers();
  });

  after(async () => {
    await stopWatchers();
    try {
      await Cargo.deleteMany({});
      await Personnel.deleteMany({});
      await SOSAlert.deleteMany({});
      await SyncLog.deleteMany({});
    } catch (e) {}
    await mongoose.connection.close();
    if (replSet) {
      await replSet.stop();
    }
  });

  // ==========================================
  // 1. Authentication API Tests
  // ==========================================
  describe('Authentication API (/api/auth)', () => {
    test('POST /api/auth/register should register a new personnel and return token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Dr. John Watson',
          email: 'watson@polarlink.expedition',
          password: 'password123',
          role: 'medic',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.email, 'watson@polarlink.expedition');
      assert.equal(res.body.data.role, 'medic');
      assert.ok(res.body.data.personnelId);
    });

    test('POST /api/auth/register should fail on duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Watson',
          email: 'watson@polarlink.expedition',
          password: 'password123',
          role: 'medic',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /already registered/i);
    });

    test('POST /api/auth/login should authenticate successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mercer@polarlink.expedition',
          password: 'polar123',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.personnelId, 'pers-cmd-01');
      assert.equal(res.body.data.role, 'commander');
    });

    test('POST /api/auth/login should reject incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mercer@polarlink.expedition',
          password: 'wrongpassword',
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Invalid email or password/i);
    });

    test('GET /api/auth/me should return current user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${commanderToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.personnelId, 'pers-cmd-01');
      assert.equal(res.body.data.role, 'commander');
      assert.equal(res.body.data.passwordHash, undefined); // Excluded for security
    });

    test('GET /api/auth/me should reject request without token with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });
  });

  // ==========================================
  // 2. Public Health & Global Auth Guard Tests
  // ==========================================
  describe('Global Route Protection & Health Check', () => {
    test('GET /api/health should remain public (no token needed)', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'healthy');
    });

    test('POST /api/cargo without token should return 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/cargo')
        .send({ name: 'Unauth Crate', category: 'food', quantity: 10 });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('GET /api/dashboard/stats without token should return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/dashboard/stats');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('GET /api/dashboard/stats with valid token should return 200', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${commanderToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.personnelByRole);
    });
  });

  // ==========================================
  // 3. Cargo API & RBAC (Confirmation Rules)
  // ==========================================
  describe('Cargo API & Confirmation RBAC (/api/cargo)', () => {
    let createdItemId = 'test-cargo-uuid-001';

    test('POST /api/cargo should create cargo and assign orderedBy from authenticated user', async () => {
      const newCargo = {
        itemId: createdItemId,
        name: 'Cold Weather Rations',
        category: 'food',
        quantity: 5,
        unit: 'crates',
        criticalThreshold: 10,
        currentLocation: {
          stationId: 'station-alpha',
          coordinates: { lat: -77.846, lng: 166.668 },
        },
      };

      const res = await request(app)
        .post('/api/cargo')
        .set('Authorization', `Bearer ${scientistToken}`)
        .send(newCargo);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.itemId, createdItemId);
      assert.equal(res.body.data.orderedBy, 'pers-sci-01');
      assert.equal(res.body.data.currentLocation.status, 'requested');
    });

    test('PUT /api/cargo/:itemId/confirm as scientist should return 403 Forbidden', async () => {
      const res = await request(app)
        .put(`/api/cargo/${createdItemId}/confirm`)
        .set('Authorization', `Bearer ${scientistToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Forbidden/i);
    });

    test('PUT /api/cargo/:itemId/confirm as commander should return 200 and set confirmedBy & warehouse status', async () => {
      const res = await request(app)
        .put(`/api/cargo/${createdItemId}/confirm`)
        .set('Authorization', `Bearer ${commanderToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.confirmedBy, 'pers-cmd-01');
      assert.equal(res.body.data.currentLocation.status, 'warehouse');
    });

    test('GET /api/cargo should list cargo items for authenticated users', async () => {
      const res = await request(app)
        .get('/api/cargo')
        .set('Authorization', `Bearer ${scientistToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((c) => c.itemId === createdItemId));
    });

    test('GET /api/cargo/low-stock should return items with quantity <= criticalThreshold', async () => {
      const res = await request(app)
        .get('/api/cargo/low-stock')
        .set('Authorization', `Bearer ${logisticsToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.some((c) => c.itemId === createdItemId));
    });
  });

  // ==========================================
  // 4. Personnel API Tests
  // ==========================================
  describe('Personnel API (/api/personnel)', () => {
    test('GET /api/personnel should list all personnel with auth token', async () => {
      const res = await request(app)
        .get('/api/personnel')
        .set('Authorization', `Bearer ${commanderToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.length >= 8);
    });

    test('GET /api/personnel/available-medics should list cleared medics', async () => {
      const res = await request(app)
        .get('/api/personnel/available-medics?stationId=station-alpha')
        .set('Authorization', `Bearer ${commanderToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.every((m) => m.role === 'medic'));
    });
  });

  // ==========================================
  // 5. SOS Alert System & Resolution RBAC
  // ==========================================
  describe('SOS Alert System & Resolution RBAC (/api/sos)', () => {
    let activeAlertId;

    test('POST /api/sos should allow any role (scientist) to raise SOS with raisedBy automatically set', async () => {
      const res = await request(app)
        .post('/api/sos')
        .set('Authorization', `Bearer ${scientistToken}`)
        .send({
          stationId: 'station-alpha',
          severity: 'critical',
          location: { lat: -77.846, lng: 166.668 },
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.raisedBy, 'pers-sci-01');
      assert.equal(res.body.data.status, 'active');
      activeAlertId = res.body.data.alertId;
    });

    test('PUT /api/sos/:alertId/resolve as logistics should return 403 Forbidden', async () => {
      const res = await request(app)
        .put(`/api/sos/${activeAlertId}/resolve`)
        .set('Authorization', `Bearer ${logisticsToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /Forbidden/i);
    });

    test('PUT /api/sos/:alertId/acknowledge as medic should return 200', async () => {
      const res = await request(app)
        .put(`/api/sos/${activeAlertId}/acknowledge`)
        .set('Authorization', `Bearer ${medicToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'acknowledged');
    });

    test('PUT /api/sos/:alertId/resolve as medic should return 200 and set resolvedBy', async () => {
      const res = await request(app)
        .put(`/api/sos/${activeAlertId}/resolve`)
        .set('Authorization', `Bearer ${medicToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'resolved');
      assert.equal(res.body.data.resolvedBy, 'pers-medic-01');
    });
  });

  // ==========================================
  // 6. Mainland HQ Overview RBAC
  // ==========================================
  describe('Mainland HQ Overview API (/api/dashboard/hq-overview)', () => {
    test('GET /api/dashboard/hq-overview as scientist should return 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/dashboard/hq-overview')
        .set('Authorization', `Bearer ${scientistToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    test('GET /api/dashboard/hq-overview as hq_admin should return 200 and station telemetry array', async () => {
      const res = await request(app)
        .get('/api/dashboard/hq-overview')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(typeof res.body.data.totalCargo, 'number');
      assert.equal(typeof res.body.data.totalPersonnel, 'number');
      assert.equal(typeof res.body.data.activeSOSCount, 'number');
      assert.ok(Array.isArray(res.body.data.stations));
      assert.ok(res.body.data.stations.length > 0);
      assert.ok(res.body.data.stations[0].stationId);
      assert.equal(typeof res.body.data.stations[0].pendingSyncCount, 'number');
    });
  });

  // ==========================================
  // 7. Offline Sync Engine API Tests
  // ==========================================
  describe('Offline Sync Engine (/api/sync)', () => {
    test('GET /api/sync/pending should return unsynced records with auth token', async () => {
      const res = await request(app)
        .get('/api/sync/pending')
        .set('Authorization', `Bearer ${commanderToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.cargo));
      assert.ok(Array.isArray(res.body.data.personnel));
    });

    test('POST /api/sync/ack should acknowledge synced records', async () => {
      const res = await request(app)
        .post('/api/sync/ack')
        .set('Authorization', `Bearer ${commanderToken}`)
        .send({
          items: [{ collection: 'cargo', documentId: 'test-cargo-uuid-001' }],
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.acknowledgedCount, 1);
    });
  });
});
