require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const connectDB = require('./config/db');
const Cargo = require('./models/Cargo');
const Personnel = require('./models/Personnel');
const SOSAlert = require('./models/SOSAlert');
const SyncLog = require('./models/SyncLog');

const seedCargoData = [
  {
    itemId: 'carg-7f2a-4890-8801',
    name: 'Freeze-Dried Rations Pack A (7-Day)',
    category: 'food',
    quantity: 150,
    unit: 'packs',
    currentLocation: {
      stationId: 'station-alpha',
      coordinates: { lat: -77.846, lng: 166.668 },
      status: 'warehouse',
    },
    transitHistory: [
      {
        fromStation: 'mcmurdo-base',
        toStation: 'station-alpha',
        timestamp: new Date(Date.now() - 14 * 86400000),
        handledBy: 'pers-logistics-01',
      },
    ],
    expiryDate: new Date('2028-12-31'),
    criticalThreshold: 30,
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    itemId: 'carg-7f2a-4890-8802',
    name: 'Emergency High-Calorie Nutri-Bars',
    category: 'food',
    quantity: 8, // Low stock: 8 <= 15
    unit: 'boxes',
    currentLocation: {
      stationId: 'station-alpha',
      coordinates: { lat: -77.846, lng: 166.668 },
      status: 'warehouse',
    },
    transitHistory: [],
    expiryDate: new Date('2027-06-30'),
    criticalThreshold: 15,
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    itemId: 'carg-7f2a-4890-8803',
    name: 'Arctic Grade Jet-A1 Fuel Drums',
    category: 'fuel',
    quantity: 45,
    unit: 'drums',
    currentLocation: {
      stationId: 'station-alpha',
      coordinates: { lat: -77.846, lng: 166.668 },
      status: 'warehouse',
    },
    transitHistory: [],
    expiryDate: new Date('2030-01-01'),
    criticalThreshold: 10,
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    itemId: 'carg-7f2a-4890-8804',
    name: 'Stove Generator Kerosene Canisters',
    category: 'fuel',
    quantity: 4, // Low stock: 4 <= 12
    unit: 'canisters',
    currentLocation: {
      stationId: 'station-alpha',
      coordinates: { lat: -77.846, lng: 166.668 },
      status: 'warehouse',
    },
    transitHistory: [],
    expiryDate: new Date('2029-05-15'),
    criticalThreshold: 12,
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    itemId: 'carg-7f2a-4890-8805',
    name: 'Trauma & Hypothermia First-Aid Emergency Kit',
    category: 'medical',
    quantity: 24,
    unit: 'kits',
    currentLocation: {
      stationId: 'station-alpha',
      coordinates: { lat: -77.846, lng: 166.668 },
      status: 'warehouse',
    },
    transitHistory: [],
    expiryDate: new Date('2027-11-20'),
    criticalThreshold: 5,
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    itemId: 'carg-7f2a-4890-8806',
    name: 'Portable Automated External Defibrillator (AED)',
    category: 'medical',
    quantity: 3,
    unit: 'units',
    currentLocation: {
      stationId: 'station-alpha',
      coordinates: { lat: -77.846, lng: 166.668 },
      status: 'warehouse',
    },
    transitHistory: [],
    expiryDate: new Date('2028-09-10'),
    criticalThreshold: 2,
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    itemId: 'carg-7f2a-4890-8807',
    name: 'EpiPen Auto-Injectors (0.3mg Adult)',
    category: 'medical',
    quantity: 2, // Low stock: 2 <= 6
    unit: 'packs',
    currentLocation: {
      stationId: 'station-alpha',
      coordinates: { lat: -77.846, lng: 166.668 },
      status: 'warehouse',
    },
    transitHistory: [],
    expiryDate: new Date('2026-12-01'),
    criticalThreshold: 6,
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    itemId: 'carg-7f2a-4890-8808',
    name: 'Heavy Arctic Weather All-Season Tents',
    category: 'equipment',
    quantity: 16,
    unit: 'tents',
    currentLocation: {
      stationId: 'station-alpha',
      coordinates: { lat: -77.846, lng: 166.668 },
      status: 'warehouse',
    },
    transitHistory: [],
    expiryDate: null,
    criticalThreshold: 4,
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    itemId: 'carg-7f2a-4890-8809',
    name: 'Deep Ice Core Drilling Diamond Bit Assembly',
    category: 'scientific',
    quantity: 7,
    unit: 'units',
    currentLocation: {
      stationId: 'station-alpha',
      coordinates: { lat: -77.846, lng: 166.668 },
      status: 'warehouse',
    },
    transitHistory: [],
    expiryDate: null,
    criticalThreshold: 3,
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    itemId: 'carg-7f2a-4890-8810',
    name: 'Iridium Extreme Satellite Transceiver Units',
    category: 'equipment',
    quantity: 12,
    unit: 'units',
    currentLocation: {
      stationId: 'station-alpha',
      coordinates: { lat: -77.846, lng: 166.668 },
      status: 'warehouse',
    },
    transitHistory: [],
    expiryDate: null,
    criticalThreshold: 4,
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
];

const seedPersonnelData = [
  {
    personnelId: 'pers-medic-01',
    name: 'Dr. Erik Lindqvist',
    role: 'medic',
    medicalClearance: {
      status: 'cleared',
      lastCheckupDate: new Date('2026-08-10'),
      conditions: [],
      bloodGroup: 'O+',
    },
    trainingStatus: [
      {
        trainingType: 'Polar Trauma & Frostbite Protocol',
        completedDate: new Date('2026-01-15'),
        expiryDate: new Date('2027-01-15'),
        certified: true,
      },
      {
        trainingType: 'Arctic Survival Level 3',
        completedDate: new Date('2025-11-20'),
        expiryDate: new Date('2027-11-20'),
        certified: true,
      },
    ],
    currentLocation: {
      stationId: 'station-alpha',
      lastCheckIn: new Date(),
    },
    emergencyContact: {
      name: 'Astrid Lindqvist',
      relation: 'Spouse',
      phone: '+46-70-1234567',
    },
    sosStatus: 'safe',
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    personnelId: 'pers-medic-02',
    name: 'Dr. Sarah Vance',
    role: 'medic',
    medicalClearance: {
      status: 'restricted',
      lastCheckupDate: new Date('2026-07-22'),
      conditions: ['Mild Frostbite Recovery'],
      bloodGroup: 'A-',
    },
    trainingStatus: [
      {
        trainingType: 'Advanced Trauma Life Support',
        completedDate: new Date('2025-05-10'),
        expiryDate: new Date('2027-05-10'),
        certified: true,
      },
    ],
    currentLocation: {
      stationId: 'station-alpha',
      lastCheckIn: new Date(),
    },
    emergencyContact: {
      name: 'James Vance',
      relation: 'Brother',
      phone: '+1-555-019-2834',
    },
    sosStatus: 'safe',
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    personnelId: 'pers-cmd-01',
    name: 'Commander Alex Mercer',
    role: 'commander',
    medicalClearance: {
      status: 'cleared',
      lastCheckupDate: new Date('2026-08-01'),
      conditions: [],
      bloodGroup: 'B+',
    },
    trainingStatus: [
      {
        trainingType: 'Expedition Command & Severe Weather Operations',
        completedDate: new Date('2025-09-01'),
        expiryDate: new Date('2028-09-01'),
        certified: true,
      },
    ],
    currentLocation: {
      stationId: 'station-alpha',
      lastCheckIn: new Date(),
    },
    emergencyContact: {
      name: 'Hannah Mercer',
      relation: 'Spouse',
      phone: '+44-20-7946-0912',
    },
    sosStatus: 'safe',
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    personnelId: 'pers-sci-01',
    name: 'Dr. Elena Rostova',
    role: 'scientist',
    medicalClearance: {
      status: 'cleared',
      lastCheckupDate: new Date('2026-08-15'),
      conditions: [],
      bloodGroup: 'AB+',
    },
    trainingStatus: [
      {
        trainingType: 'Glaciology Deep Field Protocols',
        completedDate: new Date('2026-02-10'),
        expiryDate: new Date('2027-02-10'),
        certified: true,
      },
    ],
    currentLocation: {
      stationId: 'station-alpha',
      lastCheckIn: new Date(),
    },
    emergencyContact: {
      name: 'Mikhail Rostov',
      relation: 'Father',
      phone: '+33-1-42685555',
    },
    sosStatus: 'safe',
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    personnelId: 'pers-eng-01',
    name: 'Marcus Brody',
    role: 'engineer',
    medicalClearance: {
      status: 'cleared',
      lastCheckupDate: new Date('2026-06-30'),
      conditions: [],
      bloodGroup: 'O-',
    },
    trainingStatus: [
      {
        trainingType: 'Geothermal Generator Systems',
        completedDate: new Date('2025-08-12'),
        expiryDate: new Date('2027-08-12'),
        certified: true,
      },
    ],
    currentLocation: {
      stationId: 'station-alpha',
      lastCheckIn: new Date(),
    },
    emergencyContact: {
      name: 'Laura Brody',
      relation: 'Sister',
      phone: '+1-555-483-9201',
    },
    sosStatus: 'safe',
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    personnelId: 'pers-log-01',
    name: 'Tenzing Norbu',
    role: 'logistics',
    medicalClearance: {
      status: 'cleared',
      lastCheckupDate: new Date('2026-07-15'),
      conditions: [],
      bloodGroup: 'A+',
    },
    trainingStatus: [
      {
        trainingType: 'Heavy Traverse & Cargo Handling',
        completedDate: new Date('2025-10-05'),
        expiryDate: new Date('2027-10-05'),
        certified: true,
      },
    ],
    currentLocation: {
      stationId: 'station-alpha',
      lastCheckIn: new Date(),
    },
    emergencyContact: {
      name: 'Pasang Norbu',
      relation: 'Brother',
      phone: '+977-1-4412345',
    },
    sosStatus: 'safe',
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    personnelId: 'pers-sci-02',
    name: 'Chloe Bennett',
    role: 'scientist',
    medicalClearance: {
      status: 'pending',
      lastCheckupDate: new Date('2026-05-12'),
      conditions: ['Awaiting Pulmonary Clearance'],
      bloodGroup: 'O+',
    },
    trainingStatus: [
      {
        trainingType: 'Atmospheric Aerosol Sampling',
        completedDate: new Date('2026-03-01'),
        expiryDate: new Date('2027-03-01'),
        certified: true,
      },
    ],
    currentLocation: {
      stationId: 'station-alpha',
      lastCheckIn: new Date(),
    },
    emergencyContact: {
      name: 'Robert Bennett',
      relation: 'Father',
      phone: '+44-161-496-0182',
    },
    sosStatus: 'safe',
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
  {
    personnelId: 'pers-eng-02',
    name: 'Sven Larson',
    role: 'engineer',
    medicalClearance: {
      status: 'expired',
      lastCheckupDate: new Date('2025-04-10'),
      conditions: ['Annual Polar Physical Overdue'],
      bloodGroup: 'B-',
    },
    trainingStatus: [
      {
        trainingType: 'Snowcat Engine Overhaul',
        completedDate: new Date('2024-11-15'),
        expiryDate: new Date('2026-11-15'),
        certified: true,
      },
    ],
    currentLocation: {
      stationId: 'station-alpha',
      lastCheckIn: new Date(),
    },
    emergencyContact: {
      name: 'Greta Larson',
      relation: 'Mother',
      phone: '+47-22-869000',
    },
    sosStatus: 'safe',
    _synced: false,
    _lastModified: new Date(),
    _deleted: false,
  },
];

async function seedDatabase() {
  console.log('[SEED] Connecting to MongoDB to populate demo data...');
  await connectDB();

  try {
    // Clear existing collections
    console.log('[SEED] Resetting Cargo, Personnel, SOSAlert, and SyncLog collections...');
    await Cargo.deleteMany({});
    await Personnel.deleteMany({});
    await SOSAlert.deleteMany({});
    await SyncLog.deleteMany({});

    // Insert Cargo
    console.log(`[SEED] Inserting ${seedCargoData.length} cargo items...`);
    const insertedCargo = await Cargo.insertMany(seedCargoData);

    // Insert Personnel
    console.log(`[SEED] Inserting ${seedPersonnelData.length} expedition personnel...`);
    const insertedPersonnel = await Personnel.insertMany(seedPersonnelData);

    console.log('========================================================');
    console.log('❄️  POLARLINK SEEDING COMPLETED SUCCESSFULLY!  ❄️');
    console.log(`📦  Cargo items seeded: ${insertedCargo.length}`);
    console.log(`👤  Personnel seeded:   ${insertedPersonnel.length}`);
    console.log('    - Roles: 2 medics, 2 scientists, 2 engineers, 1 commander, 1 logistics');
    console.log('    - Clearances: 5 cleared, 1 restricted, 1 pending, 1 expired');
    console.log('    - Low stock items: 3 (Nutri-Bars, Kerosene, EpiPens)');
    console.log('========================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[SEED ERROR] Seeding failed:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedCargoData, seedPersonnelData };
