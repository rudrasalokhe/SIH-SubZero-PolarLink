import { v4 as uuidv4 } from 'uuid';
import {
  CargoItem,
  PersonnelItem,
  SOSAlertItem,
  DashboardStats,
} from './types';

// Browser-safe WA-SQLite instance holder
let sqlite3Instance: any = null;
let dbHandle: any = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// In-memory fallback mirrors SQLite tables if WASM VFS is loading or fallback needed
const memoryStore = {
  cargo: new Map<string, CargoItem>(),
  personnel: new Map<string, PersonnelItem>(),
  sosAlerts: new Map<string, SOSAlertItem>(),
};

const persistMemoryStore = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('polarlink_cargo', JSON.stringify(Array.from(memoryStore.cargo.entries())));
    localStorage.setItem('polarlink_personnel', JSON.stringify(Array.from(memoryStore.personnel.entries())));
    localStorage.setItem('polarlink_sos', JSON.stringify(Array.from(memoryStore.sosAlerts.entries())));
  } catch (e) {
    console.warn('[STORAGE] Failed to persist to localStorage:', e);
  }
};

const restoreMemoryStore = () => {
  if (typeof window === 'undefined') return;
  try {
    const cargoData = localStorage.getItem('polarlink_cargo');
    if (cargoData) {
      const entries: [string, CargoItem][] = JSON.parse(cargoData);
      entries.forEach(([k, v]) => memoryStore.cargo.set(k, v));
    }
    const personnelData = localStorage.getItem('polarlink_personnel');
    if (personnelData) {
      const entries: [string, PersonnelItem][] = JSON.parse(personnelData);
      entries.forEach(([k, v]) => memoryStore.personnel.set(k, v));
    }
    const sosData = localStorage.getItem('polarlink_sos');
    if (sosData) {
      const entries: [string, SOSAlertItem][] = JSON.parse(sosData);
      entries.forEach(([k, v]) => memoryStore.sosAlerts.set(k, v));
    }
  } catch (e) {
    console.warn('[STORAGE] Failed to restore from localStorage:', e);
  }
};

/**
 * Initialize WA-SQLite database with MemoryAsyncVFS and local persistent cache
 */
export async function initDatabase(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (isInitialized) return;
  if (initPromise) return initPromise;

  const actualInit = async () => {
    try {
      restoreMemoryStore();

      // Dynamic imports to ensure browser-only execution
      const SQLite = await import('wa-sqlite');
      // @ts-ignore
      const SQLiteESMFactory = (await import('wa-sqlite/dist/wa-sqlite.mjs')).default;

      const module = await SQLiteESMFactory({
        locateFile: (file: string) => `/${file}`,
      });
      sqlite3Instance = SQLite.Factory(module);

      dbHandle = await sqlite3Instance.open_v2('polarlink.db');

      // Create Tables
      await executeSQL(`
        CREATE TABLE IF NOT EXISTS cargo (
          itemId TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          quantity REAL NOT NULL,
          unit TEXT DEFAULT 'units',
          stationId TEXT DEFAULT 'station-alpha',
          status TEXT DEFAULT 'warehouse',
          orderedBy TEXT DEFAULT 'commander',
          confirmedBy TEXT,
          coordinates TEXT,
          transitHistory TEXT,
          expiryDate TEXT,
          criticalThreshold REAL DEFAULT 10,
          _synced INTEGER DEFAULT 0,
          _lastModified TEXT,
          _deleted INTEGER DEFAULT 0,
          _pending_sync INTEGER DEFAULT 1,
          _local_id TEXT NOT NULL,
          createdAt TEXT,
          updatedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS personnel (
          personnelId TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          medicalClearance TEXT,
          trainingStatus TEXT,
          currentLocation TEXT,
          emergencyContact TEXT,
          sosStatus TEXT DEFAULT 'safe',
          _synced INTEGER DEFAULT 0,
          _lastModified TEXT,
          _deleted INTEGER DEFAULT 0,
          _pending_sync INTEGER DEFAULT 1,
          _local_id TEXT NOT NULL,
          createdAt TEXT,
          updatedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS sos_alerts (
          alertId TEXT PRIMARY KEY,
          raisedBy TEXT NOT NULL,
          resolvedBy TEXT,
          stationId TEXT NOT NULL,
          location TEXT,
          severity TEXT DEFAULT 'critical',
          status TEXT DEFAULT 'active',
          matchedMedic TEXT,
          matchedInventory TEXT,
          _synced INTEGER DEFAULT 0,
          _lastModified TEXT,
          _deleted INTEGER DEFAULT 0,
          _pending_sync INTEGER DEFAULT 1,
          _local_id TEXT NOT NULL,
          createdAt TEXT,
          updatedAt TEXT
        );
      `);

      // Safe column additions for existing SQLite databases
      try {
        await executeSQL('ALTER TABLE cargo ADD COLUMN orderedBy TEXT;');
      } catch {}
      try {
        await executeSQL('ALTER TABLE cargo ADD COLUMN confirmedBy TEXT;');
      } catch {}
      try {
        await executeSQL('ALTER TABLE sos_alerts ADD COLUMN resolvedBy TEXT;');
      } catch {}

      isInitialized = true;
      console.log('❄️ [LOCAL SQLITE] PolarLink WA-SQLite Database Ready with Offline Tables');
    } catch (err: any) {
      console.warn('[LOCAL SQLITE] WebAssembly SQLite initialization fallback to memory store:', err?.message || err);
      isInitialized = true;
    }
  };

  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      if (!isInitialized) {
        console.warn('[LOCAL SQLITE] Init timeout reached - fallback memory store active');
        isInitialized = true;
      }
      resolve();
    }, 2500);
  });

  initPromise = Promise.race([actualInit(), timeoutPromise]);
  return initPromise;
}

/**
 * Execute raw SQL statement
 */
export async function executeSQL(sql: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!dbHandle || !sqlite3Instance) return;

  try {
    await sqlite3Instance.exec(dbHandle, sql);
  } catch (e) {
    console.warn('executeSQL error (fallback active):', e);
  }
}

/**
 * Query SQL and return array of objects
 */
export async function querySQL<T = any>(sql: string): Promise<T[]> {
  if (typeof window === 'undefined') return [];
  if (!dbHandle || !sqlite3Instance) return [];

  const rows: T[] = [];
  try {
    await sqlite3Instance.exec(dbHandle, sql, (rowValues: any[], columnNames: string[]) => {
      const obj: any = {};
      for (let i = 0; i < columnNames.length; i++) {
        obj[columnNames[i]] = rowValues[i];
      }
      rows.push(obj);
    });
  } catch (e) {
    console.warn('querySQL error (fallback active):', e);
  }
  return rows;
}

// =========================================================================
// CARGO LOCAL CRUD HELPERS
// =========================================================================

export async function getAllCargoLocal(includeDeleted = false): Promise<CargoItem[]> {
  await initDatabase();

  if (dbHandle && sqlite3Instance) {
    try {
      const sql = `SELECT * FROM cargo ${includeDeleted ? '' : 'WHERE _deleted = 0'} ORDER BY createdAt DESC;`;
      const rows = await querySQL<any>(sql);
      return rows.map(formatCargoFromRow);
    } catch (e) {
      console.error('SQLite query error on cargo:', e);
    }
  }

  // Fallback
  return Array.from(memoryStore.cargo.values()).filter(
    (c) => includeDeleted || !c._deleted
  );
}

export async function getCargoByIdLocal(itemId: string): Promise<CargoItem | null> {
  await initDatabase();

  if (dbHandle && sqlite3Instance) {
    try {
      const sql = `SELECT * FROM cargo WHERE itemId = '${sanitize(itemId)}' LIMIT 1;`;
      const rows = await querySQL<any>(sql);
      if (rows.length > 0) return formatCargoFromRow(rows[0]);
    } catch (e) {
      console.error('SQLite getCargoById error:', e);
    }
  }

  return memoryStore.cargo.get(itemId) || null;
}

export async function saveCargoLocal(
  cargo: Partial<CargoItem>,
  pendingSync = true
): Promise<CargoItem> {
  await initDatabase();

  const now = new Date().toISOString();
  const itemId = cargo.itemId || uuidv4();
  const localId = cargo._local_id || uuidv4();

  const fullCargo: CargoItem = {
    itemId,
    name: cargo.name || 'Unnamed Cargo',
    category: cargo.category || 'other',
    quantity: Number(cargo.quantity || 0),
    unit: cargo.unit || 'units',
    orderedBy: cargo.orderedBy || 'commander',
    confirmedBy: cargo.confirmedBy || null,
    currentLocation: {
      stationId: cargo.currentLocation?.stationId || 'station-alpha',
      coordinates: cargo.currentLocation?.coordinates || { lat: -77.846, lng: 166.668 },
      status: cargo.currentLocation?.status || 'warehouse',
    },
    transitHistory: cargo.transitHistory || [],
    expiryDate: cargo.expiryDate || null,
    criticalThreshold: Number(cargo.criticalThreshold ?? 10),
    _synced: cargo._synced ?? false,
    _lastModified: now,
    _deleted: cargo._deleted ?? false,
    _pending_sync: pendingSync,
    _local_id: localId,
    createdAt: cargo.createdAt || now,
    updatedAt: now,
  };

  if (dbHandle && sqlite3Instance) {
    try {
      const sql = `
        INSERT OR REPLACE INTO cargo (
          itemId, name, category, quantity, unit, stationId, status, orderedBy, confirmedBy,
          coordinates, transitHistory, expiryDate, criticalThreshold,
          _synced, _lastModified, _deleted, _pending_sync, _local_id, createdAt, updatedAt
        ) VALUES (
          '${sanitize(fullCargo.itemId)}',
          '${sanitize(fullCargo.name)}',
          '${sanitize(fullCargo.category)}',
          ${fullCargo.quantity},
          '${sanitize(fullCargo.unit)}',
          '${sanitize(fullCargo.currentLocation.stationId)}',
          '${sanitize(fullCargo.currentLocation.status)}',
          '${sanitize(fullCargo.orderedBy || 'commander')}',
          ${fullCargo.confirmedBy ? `'${sanitize(fullCargo.confirmedBy)}'` : 'NULL'},
          '${sanitize(JSON.stringify(fullCargo.currentLocation.coordinates))}',
          '${sanitize(JSON.stringify(fullCargo.transitHistory || []))}',
          ${fullCargo.expiryDate ? `'${sanitize(fullCargo.expiryDate)}'` : 'NULL'},
          ${fullCargo.criticalThreshold},
          ${fullCargo._synced ? 1 : 0},
          '${sanitize(fullCargo._lastModified || now)}',
          ${fullCargo._deleted ? 1 : 0},
          ${fullCargo._pending_sync ? 1 : 0},
          '${sanitize(fullCargo._local_id || localId)}',
          '${sanitize(fullCargo.createdAt || now)}',
          '${sanitize(fullCargo.updatedAt || now)}'
        );
      `;
      await executeSQL(sql);
    } catch (e) {
      console.error('Failed to write cargo to WA-SQLite:', e);
    }
  }

  memoryStore.cargo.set(fullCargo.itemId, fullCargo);
  persistMemoryStore();
  return fullCargo;
}

export async function confirmCargoLocal(itemId: string, confirmedByPersonnelId: string): Promise<CargoItem | null> {
  const existing = await getCargoByIdLocal(itemId);
  if (!existing) return null;
  existing.confirmedBy = confirmedByPersonnelId;
  existing.currentLocation.status = 'warehouse';
  existing._pending_sync = true;
  existing._synced = false;
  existing._lastModified = new Date().toISOString();
  return await saveCargoLocal(existing, true);
}

export async function deleteCargoLocal(itemId: string): Promise<void> {
  const existing = await getCargoByIdLocal(itemId);
  if (existing) {
    existing._deleted = true;
    existing._pending_sync = true;
    existing._synced = false;
    existing._lastModified = new Date().toISOString();
    await saveCargoLocal(existing, true);
  }
}

// =========================================================================
// PERSONNEL LOCAL CRUD HELPERS
// =========================================================================

export async function getAllPersonnelLocal(includeDeleted = false): Promise<PersonnelItem[]> {
  await initDatabase();

  if (dbHandle && sqlite3Instance) {
    try {
      const sql = `SELECT * FROM personnel ${includeDeleted ? '' : 'WHERE _deleted = 0'} ORDER BY createdAt DESC;`;
      const rows = await querySQL<any>(sql);
      return rows.map(formatPersonnelFromRow);
    } catch (e) {
      console.error('SQLite query error on personnel:', e);
    }
  }

  return Array.from(memoryStore.personnel.values()).filter(
    (p) => includeDeleted || !p._deleted
  );
}

export async function getPersonnelByIdLocal(personnelId: string): Promise<PersonnelItem | null> {
  await initDatabase();

  if (dbHandle && sqlite3Instance) {
    try {
      const sql = `SELECT * FROM personnel WHERE personnelId = '${sanitize(personnelId)}' LIMIT 1;`;
      const rows = await querySQL<any>(sql);
      if (rows.length > 0) return formatPersonnelFromRow(rows[0]);
    } catch (e) {
      console.error('SQLite getPersonnelById error:', e);
    }
  }

  return memoryStore.personnel.get(personnelId) || null;
}

export async function savePersonnelLocal(
  personnel: Partial<PersonnelItem>,
  pendingSync = true
): Promise<PersonnelItem> {
  await initDatabase();

  const now = new Date().toISOString();
  const personnelId = personnel.personnelId || `pers-${uuidv4().substring(0, 8)}`;
  const localId = personnel._local_id || uuidv4();

  const fullPersonnel: PersonnelItem = {
    personnelId,
    name: personnel.name || 'Unnamed Personnel',
    role: personnel.role || 'scientist',
    medicalClearance: personnel.medicalClearance || {
      status: 'pending',
      conditions: [],
      bloodGroup: 'O+',
    },
    trainingStatus: personnel.trainingStatus || [],
    currentLocation: personnel.currentLocation || {
      stationId: 'station-alpha',
      lastCheckIn: now,
    },
    emergencyContact: personnel.emergencyContact || {
      name: '',
      relation: '',
      phone: '',
    },
    sosStatus: personnel.sosStatus || 'safe',
    _synced: personnel._synced ?? false,
    _lastModified: now,
    _deleted: personnel._deleted ?? false,
    _pending_sync: pendingSync,
    _local_id: localId,
    createdAt: personnel.createdAt || now,
    updatedAt: now,
  };

  if (dbHandle && sqlite3Instance) {
    try {
      const sql = `
        INSERT OR REPLACE INTO personnel (
          personnelId, name, role, medicalClearance, trainingStatus,
          currentLocation, emergencyContact, sosStatus,
          _synced, _lastModified, _deleted, _pending_sync, _local_id, createdAt, updatedAt
        ) VALUES (
          '${sanitize(fullPersonnel.personnelId)}',
          '${sanitize(fullPersonnel.name)}',
          '${sanitize(fullPersonnel.role)}',
          '${sanitize(JSON.stringify(fullPersonnel.medicalClearance))}',
          '${sanitize(JSON.stringify(fullPersonnel.trainingStatus))}',
          '${sanitize(JSON.stringify(fullPersonnel.currentLocation))}',
          '${sanitize(JSON.stringify(fullPersonnel.emergencyContact))}',
          '${sanitize(fullPersonnel.sosStatus)}',
          ${fullPersonnel._synced ? 1 : 0},
          '${sanitize(fullPersonnel._lastModified || now)}',
          ${fullPersonnel._deleted ? 1 : 0},
          ${fullPersonnel._pending_sync ? 1 : 0},
          '${sanitize(fullPersonnel._local_id || localId)}',
          '${sanitize(fullPersonnel.createdAt || now)}',
          '${sanitize(fullPersonnel.updatedAt || now)}'
        );
      `;
      await executeSQL(sql);
    } catch (e) {
      console.error('Failed to write personnel to WA-SQLite:', e);
    }
  }

  memoryStore.personnel.set(fullPersonnel.personnelId, fullPersonnel);
  persistMemoryStore();
  return fullPersonnel;
}

// =========================================================================
// SOS ALERTS LOCAL CRUD HELPERS
// =========================================================================

export async function getAllSOSAlertsLocal(): Promise<SOSAlertItem[]> {
  await initDatabase();

  if (dbHandle && sqlite3Instance) {
    try {
      const sql = `SELECT * FROM sos_alerts WHERE _deleted = 0 ORDER BY createdAt DESC;`;
      const rows = await querySQL<any>(sql);
      return rows.map(formatSOSAlertFromRow);
    } catch (e) {
      console.error('SQLite query error on sos_alerts:', e);
    }
  }

  return Array.from(memoryStore.sosAlerts.values()).filter((a) => !a._deleted);
}

export async function getSOSAlertByIdLocal(alertId: string): Promise<SOSAlertItem | null> {
  await initDatabase();

  if (dbHandle && sqlite3Instance) {
    try {
      const sql = `SELECT * FROM sos_alerts WHERE alertId = '${sanitize(alertId)}' LIMIT 1;`;
      const rows = await querySQL<any>(sql);
      if (rows.length > 0) return formatSOSAlertFromRow(rows[0]);
    } catch (e) {
      console.error('SQLite getSOSAlertById error:', e);
    }
  }

  return memoryStore.sosAlerts.get(alertId) || null;
}

export async function saveSOSAlertLocal(
  alert: Partial<SOSAlertItem>,
  pendingSync = true
): Promise<SOSAlertItem> {
  await initDatabase();

  const now = new Date().toISOString();
  const alertId = alert.alertId || `sos-${uuidv4().substring(0, 8)}`;
  const localId = alert._local_id || uuidv4();

  const fullAlert: SOSAlertItem = {
    alertId,
    raisedBy: alert.raisedBy || '',
    stationId: alert.stationId || 'station-alpha',
    location: alert.location || { lat: -77.846, lng: 166.668 },
    severity: alert.severity || 'critical',
    status: alert.status || 'active',
    resolvedBy: alert.resolvedBy || null,
    matchedMedic: alert.matchedMedic || null,
    matchedInventory: alert.matchedInventory || [],
    _synced: alert._synced ?? false,
    _lastModified: now,
    _deleted: alert._deleted ?? false,
    _pending_sync: pendingSync,
    _local_id: localId,
    createdAt: alert.createdAt || now,
    updatedAt: now,
  };

  // If local alert is raised, update raiser personnel status to emergency locally
  if (fullAlert.raisedBy && fullAlert.status === 'active') {
    const raiser = await getPersonnelByIdLocal(fullAlert.raisedBy);
    if (raiser) {
      raiser.sosStatus = 'emergency';
      await savePersonnelLocal(raiser, pendingSync);
    }
  }

  if (dbHandle && sqlite3Instance) {
    try {
      const sql = `
        INSERT OR REPLACE INTO sos_alerts (
          alertId, raisedBy, resolvedBy, stationId, location, severity, status,
          matchedMedic, matchedInventory,
          _synced, _lastModified, _deleted, _pending_sync, _local_id, createdAt, updatedAt
        ) VALUES (
          '${sanitize(fullAlert.alertId)}',
          '${sanitize(fullAlert.raisedBy)}',
          ${fullAlert.resolvedBy ? `'${sanitize(fullAlert.resolvedBy)}'` : 'NULL'},
          '${sanitize(fullAlert.stationId)}',
          '${sanitize(JSON.stringify(fullAlert.location))}',
          '${sanitize(fullAlert.severity)}',
          '${sanitize(fullAlert.status)}',
          ${fullAlert.matchedMedic ? `'${sanitize(fullAlert.matchedMedic)}'` : 'NULL'},
          '${sanitize(JSON.stringify(fullAlert.matchedInventory || []))}',
          ${fullAlert._synced ? 1 : 0},
          '${sanitize(fullAlert._lastModified || now)}',
          ${fullAlert._deleted ? 1 : 0},
          ${fullAlert._pending_sync ? 1 : 0},
          '${sanitize(fullAlert._local_id || localId)}',
          '${sanitize(fullAlert.createdAt || now)}',
          '${sanitize(fullAlert.updatedAt || now)}'
        );
      `;
      await executeSQL(sql);
    } catch (e) {
      console.error('Failed to write SOSAlert to WA-SQLite:', e);
    }
  }

  memoryStore.sosAlerts.set(fullAlert.alertId, fullAlert);
  persistMemoryStore();
  return fullAlert;
}

export async function updateSOSStatusLocal(
  alertId: string,
  status: 'acknowledged' | 'resolved',
  resolvedBy?: string | null
): Promise<SOSAlertItem | null> {
  const alert = await getSOSAlertByIdLocal(alertId);
  if (!alert) return null;

  alert.status = status;
  if (status === 'resolved' && resolvedBy) {
    alert.resolvedBy = resolvedBy;
  }
  alert._pending_sync = true;
  alert._synced = false;
  alert._lastModified = new Date().toISOString();

  // If resolved, reset raiser status back to 'safe'
  if (status === 'resolved' && alert.raisedBy) {
    const raiser = await getPersonnelByIdLocal(alert.raisedBy);
    if (raiser) {
      raiser.sosStatus = 'safe';
      await savePersonnelLocal(raiser, true);
    }
  }

  await saveSOSAlertLocal(alert, true);
  return alert;
}

// =========================================================================
// SYNC ENGINE QUERY HELPERS
// =========================================================================

export async function getPendingRecordsCount(): Promise<number> {
  await initDatabase();

  if (dbHandle && sqlite3Instance) {
    try {
      const cargoCount = (await querySQL<{ count: number }>(`SELECT COUNT(*) as count FROM cargo WHERE _pending_sync = 1;`))[0]?.count || 0;
      const persCount = (await querySQL<{ count: number }>(`SELECT COUNT(*) as count FROM personnel WHERE _pending_sync = 1;`))[0]?.count || 0;
      const sosCount = (await querySQL<{ count: number }>(`SELECT COUNT(*) as count FROM sos_alerts WHERE _pending_sync = 1;`))[0]?.count || 0;
      return cargoCount + persCount + sosCount;
    } catch (e) {
      console.error('SQLite getPendingRecordsCount error:', e);
    }
  }

  let count = 0;
  memoryStore.cargo.forEach((c) => { if (c._pending_sync) count++; });
  memoryStore.personnel.forEach((p) => { if (p._pending_sync) count++; });
  memoryStore.sosAlerts.forEach((a) => { if (a._pending_sync) count++; });
  return count;
}

export async function getPendingRecords(): Promise<{
  cargo: CargoItem[];
  personnel: PersonnelItem[];
  sosAlerts: SOSAlertItem[];
}> {
  await initDatabase();

  let cargo: CargoItem[] = [];
  let personnel: PersonnelItem[] = [];
  let sosAlerts: SOSAlertItem[] = [];

  if (dbHandle && sqlite3Instance) {
    try {
      const cargoRows = await querySQL<any>(`SELECT * FROM cargo WHERE _pending_sync = 1;`);
      cargo = cargoRows.map(formatCargoFromRow);

      const persRows = await querySQL<any>(`SELECT * FROM personnel WHERE _pending_sync = 1;`);
      personnel = persRows.map(formatPersonnelFromRow);

      const sosRows = await querySQL<any>(`SELECT * FROM sos_alerts WHERE _pending_sync = 1;`);
      sosAlerts = sosRows.map(formatSOSAlertFromRow);

      return { cargo, personnel, sosAlerts };
    } catch (e) {
      console.error('SQLite getPendingRecords error:', e);
    }
  }

  cargo = Array.from(memoryStore.cargo.values()).filter((c) => c._pending_sync);
  personnel = Array.from(memoryStore.personnel.values()).filter((p) => p._pending_sync);
  sosAlerts = Array.from(memoryStore.sosAlerts.values()).filter((a) => a._pending_sync);

  return { cargo, personnel, sosAlerts };
}

export async function markSyncedLocal(collection: string, id: string): Promise<void> {
  await initDatabase();

  if (dbHandle && sqlite3Instance) {
    try {
      if (collection === 'cargo') {
        await executeSQL(`UPDATE cargo SET _pending_sync = 0, _synced = 1 WHERE itemId = '${sanitize(id)}';`);
      } else if (collection === 'personnel') {
        await executeSQL(`UPDATE personnel SET _pending_sync = 0, _synced = 1 WHERE personnelId = '${sanitize(id)}';`);
      } else if (collection === 'sosalert' || collection === 'sos') {
        await executeSQL(`UPDATE sos_alerts SET _pending_sync = 0, _synced = 1 WHERE alertId = '${sanitize(id)}';`);
      }
    } catch (e) {
      console.error('SQLite markSyncedLocal error:', e);
    }
  }

  if (collection === 'cargo') {
    const item = memoryStore.cargo.get(id);
    if (item) { item._pending_sync = false; item._synced = true; }
  } else if (collection === 'personnel') {
    const item = memoryStore.personnel.get(id);
    if (item) { item._pending_sync = false; item._synced = true; }
  } else if (collection === 'sosalert' || collection === 'sos') {
    const item = memoryStore.sosAlerts.get(id);
    if (item) { item._pending_sync = false; item._synced = true; }
  }
}

// =========================================================================
// DASHBOARD AGGREGATE STATS FROM LOCAL SQLITE
// =========================================================================

export async function getDashboardStatsLocal(): Promise<DashboardStats> {
  const cargo = await getAllCargoLocal();
  const personnel = await getAllPersonnelLocal();
  const alerts = await getAllSOSAlertsLocal();

  const totalCargo = cargo.length;
  const lowStockCount = cargo.filter((c) => c.quantity <= c.criticalThreshold).length;
  const activeSOSCount = alerts.filter((a) => a.status === 'active').length;
  const totalPersonnel = personnel.length;

  const personnelByRole = {
    scientist: 0,
    engineer: 0,
    medic: 0,
    logistics: 0,
    commander: 0,
  };

  for (const p of personnel) {
    if (p.role in personnelByRole) {
      personnelByRole[p.role as keyof typeof personnelByRole]++;
    }
  }

  return {
    totalCargo,
    lowStockCount,
    activeSOSCount,
    totalPersonnel,
    personnelByRole,
    timestamp: new Date().toISOString(),
  };
}

// =========================================================================
// ROW FORMATTERS
// =========================================================================

function formatCargoFromRow(row: any): CargoItem {
  return {
    itemId: row.itemId,
    name: row.name,
    category: row.category,
    quantity: Number(row.quantity),
    unit: row.unit || 'units',
    orderedBy: row.orderedBy || 'commander',
    confirmedBy: row.confirmedBy || null,
    currentLocation: {
      stationId: row.stationId || 'station-alpha',
      status: row.status || 'warehouse',
      coordinates: parseJSON(row.coordinates, { lat: -77.846, lng: 166.668 }),
    },
    transitHistory: parseJSON(row.transitHistory, []),
    expiryDate: row.expiryDate,
    criticalThreshold: Number(row.criticalThreshold || 10),
    _synced: Boolean(row._synced),
    _lastModified: row._lastModified,
    _deleted: Boolean(row._deleted),
    _pending_sync: Boolean(row._pending_sync),
    _local_id: row._local_id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function formatPersonnelFromRow(row: any): PersonnelItem {
  return {
    personnelId: row.personnelId,
    name: row.name,
    role: row.role,
    medicalClearance: parseJSON(row.medicalClearance, { status: 'pending', conditions: [], bloodGroup: 'O+' }),
    trainingStatus: parseJSON(row.trainingStatus, []),
    currentLocation: parseJSON(row.currentLocation, { stationId: 'station-alpha', lastCheckIn: row.createdAt }),
    emergencyContact: parseJSON(row.emergencyContact, { name: '', relation: '', phone: '' }),
    sosStatus: row.sosStatus || 'safe',
    _synced: Boolean(row._synced),
    _lastModified: row._lastModified,
    _deleted: Boolean(row._deleted),
    _pending_sync: Boolean(row._pending_sync),
    _local_id: row._local_id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function formatSOSAlertFromRow(row: any): SOSAlertItem {
  return {
    alertId: row.alertId,
    raisedBy: row.raisedBy,
    resolvedBy: row.resolvedBy || null,
    stationId: row.stationId,
    location: parseJSON(row.location, { lat: -77.846, lng: 166.668 }),
    severity: row.severity,
    status: row.status,
    matchedMedic: row.matchedMedic,
    matchedInventory: parseJSON(row.matchedInventory, []),
    _synced: Boolean(row._synced),
    _lastModified: row._lastModified,
    _deleted: Boolean(row._deleted),
    _pending_sync: Boolean(row._pending_sync),
    _local_id: row._local_id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseJSON(val: any, fallback: any) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function sanitize(str: any) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/'/g, "''");
}
