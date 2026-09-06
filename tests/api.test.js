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

let replSet;

describe('PolarLink Station Master Node Backend Tests', () => {
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
  // Health & Dashboard Endpoints
  // ==========================================
  describe('Health & Dashboard Endpoints', () => {
    test('GET /api/health should return 200 and healthy database status', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'healthy');
      assert.equal(res.body.data.database.status, 'connected');
    });

    test('GET /api/dashboard/stats should return initial aggregated counts', async () => {
      const res = await request(app).get('/api/dashboard/stats');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(typeof res.body.data.totalCargo, 'number');
      assert.equal(typeof res.body.data.lowStockCount, 'number');
      assert.equal(typeof res.body.data.activeSOSCount, 'number');
      assert.ok(res.body.data.personnelByRole);
    });
  });

  // ==========================================
  // Cargo Endpoints & Low-Stock Filtering
  // ==========================================
  describe('Cargo API (/api/cargo)', () => {
    let createdItemId = 'test-cargo-uuid-001';

    test('POST /api/cargo should create a new cargo item', async () => {
      const newCargo = {
        itemId: createdItemId,
        name: 'Cold Weather Rations',
        category: 'food',
        quantity: 5, // Below criticalThreshold 10 (low stock)
        unit: 'crates',
        criticalThreshold: 10,
        currentLocation: {
          stationId: 'station-alpha',
          coordinates: { lat: -77.846, lng: 166.668 },
          status: 'warehouse',
        },
      };

      const res = await request(app).post('/api/cargo').send(newCargo);
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.itemId, createdItemId);
      assert.equal(res.body.data._synced, false);
      assert.equal(res.body.data._deleted, false);
    });

    test('GET /api/cargo should list cargo items and support ?category filter', async () => {
      const res = await request(app).get('/api/cargo?category=food');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((c) => c.itemId === createdItemId));
    });

    test('GET /api/cargo/low-stock should return low stock items', async () => {
      const res = await request(app).get('/api/cargo/low-stock');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((c) => c.itemId === createdItemId));
    });

    test('GET /api/cargo/:itemId should return single cargo item', async () => {
      const res = await request(app).get(`/api/cargo/${createdItemId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Cold Weather Rations');
    });

    test('PUT /api/cargo/:itemId should update cargo and enforce _synced=false', async () => {
      const res = await request(app)
        .put(`/api/cargo/${createdItemId}`)
        .send({ quantity: 25 }); // Now above critical threshold
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.quantity, 25);
      assert.equal(res.body.data._synced, false);
    });

    test('DELETE /api/cargo/:itemId should soft delete cargo (_deleted=true)', async () => {
      const res = await request(app).delete(`/api/cargo/${createdItemId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify it is excluded from regular GET
      const getRes = await request(app).get(`/api/cargo/${createdItemId}`);
      assert.equal(getRes.status, 404);

      // Verify in DB that _deleted is true
      const doc = await Cargo.findOne({ itemId: createdItemId });
      assert.equal(doc._deleted, true);
      assert.equal(doc._synced, false);
    });
  });

  // ==========================================
  // Personnel Endpoints & Available Medics
  // ==========================================
  describe('Personnel API (/api/personnel)', () => {
    let medicId = 'pers-medic-test-01';
    let engineerId = 'pers-eng-test-02';

    test('POST /api/personnel should add a cleared medic', async () => {
      const medic = {
        personnelId: medicId,
        name: 'Dr. Jane Polar',
        role: 'medic',
        medicalClearance: {
          status: 'cleared',
          conditions: [],
          bloodGroup: 'O+',
        },
        currentLocation: {
          stationId: 'station-alpha',
        },
        emergencyContact: {
          name: 'Tom Polar',
          relation: 'Spouse',
          phone: '555-1234',
        },
        sosStatus: 'safe',
      };

      const res = await request(app).post('/api/personnel').send(medic);
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.personnelId, medicId);
      assert.equal(res.body.data._synced, false);
    });

    test('POST /api/personnel should add an engineer', async () => {
      const engineer = {
        personnelId: engineerId,
        name: 'Bob Miller',
        role: 'engineer',
        medicalClearance: {
          status: 'cleared',
          bloodGroup: 'A+',
        },
        currentLocation: {
          stationId: 'station-alpha',
        },
        sosStatus: 'safe',
      };

      const res = await request(app).post('/api/personnel').send(engineer);
      assert.equal(res.status, 201);
      assert.equal(res.body.data.personnelId, engineerId);
    });

    test('GET /api/personnel/available-medics should return cleared safe medics', async () => {
      const res = await request(app).get('/api/personnel/available-medics');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.some((m) => m.personnelId === medicId));
      assert.ok(!res.body.data.some((m) => m.personnelId === engineerId));
    });

    test('GET /api/personnel/:personnelId should return single personnel', async () => {
      const res = await request(app).get(`/api/personnel/${medicId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.name, 'Dr. Jane Polar');
    });

    test('PUT /api/personnel/:personnelId should update personnel and set _synced=false', async () => {
      const res = await request(app)
        .put(`/api/personnel/${medicId}`)
        .send({ 'medicalClearance.bloodGroup': 'AB+' });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.medicalClearance.bloodGroup, 'AB+');
      assert.equal(res.body.data._synced, false);
    });
  });

  // ==========================================
  // SOS Alert Creation & Auto-matching
  // ==========================================
  describe('SOS API (/api/sos)', () => {
    let alertId = 'sos-test-alert-001';
    let medicalCargoId = 'med-cargo-test-01';

    before(async () => {
      // Seed a medical cargo item at station-alpha
      await Cargo.create({
        itemId: medicalCargoId,
        name: 'Antarctic First Aid Pack',
        category: 'medical',
        quantity: 10,
        unit: 'kits',
        currentLocation: {
          stationId: 'station-alpha',
          status: 'warehouse',
        },
        _synced: false,
        _deleted: false,
      });
    });

    test('POST /api/sos should auto-match nearest medic & inventory and set raiser to emergency', async () => {
      const res = await request(app).post('/api/sos').send({
        alertId,
        raisedBy: 'pers-eng-test-02', // Raised by Bob Miller
        stationId: 'station-alpha',
        severity: 'critical',
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.alertId, alertId);
      assert.equal(res.body.data.status, 'active');

      // Check auto-matching logic
      assert.equal(res.body.data.matchedMedic, 'pers-medic-test-01');
      assert.ok(res.body.data.matchedInventory.includes(medicalCargoId));

      // Verify the raiser's sosStatus became 'emergency'
      const raiser = await Personnel.findOne({ personnelId: 'pers-eng-test-02' });
      assert.equal(raiser.sosStatus, 'emergency');
    });

    test('GET /api/sos should list active alerts', async () => {
      const res = await request(app).get('/api/sos');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.some((a) => a.alertId === alertId));
    });

    test('PUT /api/sos/:alertId/acknowledge should acknowledge the alert', async () => {
      const res = await request(app).put(`/api/sos/${alertId}/acknowledge`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'acknowledged');
    });

    test('PUT /api/sos/:alertId/resolve should resolve alert and reset raiser to safe', async () => {
      const res = await request(app).put(`/api/sos/${alertId}/resolve`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'resolved');

      // Verify the raiser's sosStatus is reset back to 'safe'
      const raiser = await Personnel.findOne({ personnelId: 'pers-eng-test-02' });
      assert.equal(raiser.sosStatus, 'safe');
    });
  });

  // ==========================================
  // Sync Engine & Change Stream SyncLog
  // ==========================================
  describe('Offline-First Sync API (/api/sync) & Change Streams', () => {
    test('GET /api/sync/pending should return unsynced documents', async () => {
      const res = await request(app).get('/api/sync/pending');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.cargo));
      assert.ok(Array.isArray(res.body.data.personnel));
      assert.ok(res.body.data.totalPending > 0);
    });

    test('POST /api/sync/ack should mark docs as _synced=true and update SyncLog pushedToMainland=true', async () => {
      // Create a specific unsynced item
      const tempCargoId = 'sync-test-cargo-09';
      await Cargo.create({
        itemId: tempCargoId,
        name: 'Sync Test Cargo',
        category: 'equipment',
        quantity: 1,
        _synced: false,
        _deleted: false,
      });

      // Also create a SyncLog entry for it
      await SyncLog.create({
        collectionName: 'Cargo',
        documentId: tempCargoId,
        operation: 'create',
        payload: { name: 'Sync Test Cargo' },
        pushedToMainland: false,
      });

      const ackRes = await request(app)
        .post('/api/sync/ack')
        .send([
          { collection: 'Cargo', documentId: tempCargoId },
        ]);

      assert.equal(ackRes.status, 200);
      assert.equal(ackRes.body.success, true);
      assert.ok(ackRes.body.data.acknowledgedCount >= 1);

      // Verify doc is now synced in Mongo
      const updatedCargo = await Cargo.findOne({ itemId: tempCargoId });
      assert.equal(updatedCargo._synced, true);

      // Verify SyncLog has pushedToMainland=true
      const logEntry = await SyncLog.findOne({ collectionName: 'Cargo', documentId: tempCargoId });
      assert.equal(logEntry.pushedToMainland, true);
      assert.ok(logEntry.pushedAt);
    });

    test('MongoDB Change Stream should have generated SyncLog entries', async () => {
      // Give change streams a brief window to flush
      await new Promise((resolve) => setTimeout(resolve, 600));

      const logs = await SyncLog.find({});
      assert.ok(logs.length > 0, 'Change stream should have written SyncLog entries');

      const sampleLog = logs[0];
      assert.ok(sampleLog.collectionName);
      assert.ok(sampleLog.documentId);
      assert.ok(['create', 'update', 'delete'].includes(sampleLog.operation));
    });
  });

  // ==========================================
  // Seed Data Integrity Tests
  // ==========================================
  describe('Seed Data Integrity', () => {
    test('Seed cargo data conforms to Cargo schema and includes 10 items', async () => {
      assert.equal(seedCargoData.length, 10);
      for (const item of seedCargoData) {
        const doc = new Cargo(item);
        await doc.validate();
      }
    });

    test('Seed personnel data conforms to Personnel schema and includes 8 personnel', async () => {
      assert.equal(seedPersonnelData.length, 8);
      for (const item of seedPersonnelData) {
        const doc = new Personnel(item);
        await doc.validate();
      }
    });
  });
});
