# ❄️ PolarLink - Station Master Node

> **Offline-First Polar Expedition Logistics Backend**  
> Built for isolated polar research stations operating under intermittent satellite connectivity with automated local coordination, offline-first sync queues, and change stream replication.

---

## 🧭 System Overview

**PolarLink Station Master Node** serves as the localized backend operating directly at remote polar expedition outposts (e.g., McMurdo, Amundsen-Scott, Station Alpha). It enables seamless, low-latency station management without relying on mainland connectivity, automatically tracking state transitions and deltas to push to mainland servers whenever satellite links become available.

---

## 🛠️ Tech Stack

- **Runtime & Framework:** Node.js (v20+) + Express.js (REST API)
- **Database & ODM:** MongoDB (Replica Set `rs0` for Change Streams) + Mongoose
- **Offline Sync Engine:** MongoDB Change Streams (`watch()`) generating delta `SyncLog` entries
- **Containerization:** Docker + Docker Compose (`node:20-alpine` and `mongo:7.0`)
- **Logging & Utilities:** Morgan, CORS, Dotenv, UUID

---

## 📂 Folder Structure

```
/
├── Dockerfile                   # Production Node.js container definition
├── docker-compose.yml           # Orchestration for app & MongoDB replica set
├── package.json                 # Project configuration & scripts
├── .env.example                 # Environment variables template
├── .env                         # Active environment configuration
├── .dockerignore
├── .gitignore
├── src/
│   ├── config/
│   │   └── db.js                # MongoDB connection & replica set initialization
│   ├── models/
│   │   ├── Cargo.js             # Cargo schema with UUID, geo, transit, sync flags
│   │   ├── Personnel.js         # Personnel schema with clearances, trainings, SOS
│   │   ├── SyncLog.js           # Delta audit log for offline mainland synchronization
│   │   └── SOSAlert.js          # SOS schema with auto-medic & inventory matching
│   ├── controllers/
│   │   ├── cargoController.js   # Cargo CRUD, category/status filters, low-stock
│   │   ├── personnelController.js # Personnel CRUD, role filters, available-medics
│   │   ├── sosController.js     # SOS triage, medic auto-assignment, cargo matching
│   │   ├── syncController.js    # Pending sync retrieval & mainland ACK handler
│   │   ├── dashboardController.js # Aggregated metrics for station dashboards
│   │   └── healthController.js  # Node & DB connectivity health monitor
│   ├── routes/
│   │   ├── cargoRoutes.js       # /api/cargo
│   │   ├── personnelRoutes.js   # /api/personnel
│   │   ├── sosRoutes.js         # /api/sos
│   │   ├── syncRoutes.js        # /api/sync
│   │   ├── dashboardRoutes.js   # /api/dashboard
│   │   └── healthRoutes.js      # /api/health
│   ├── services/
│   │   └── changeStreamWatcher.js # MongoDB Change Stream listener for Cargo & Personnel
│   ├── middleware/
│   │   ├── errorHandler.js      # Global JSON error format: { success: false, error: ... }
│   │   └── requestLogger.js     # Morgan HTTP request logging
│   ├── seed.js                  # Demo data populator (10 cargo, 8 personnel)
│   └── server.js                # Main Express application entry point
└── tests/
    └── api.test.js              # Integration test suite with in-memory replica set
```

---

## 📦 Data Models

### 1. Cargo (`src/models/Cargo.js`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `itemId` | String (UUID, unique) | Unique client/station item identifier |
| `name` | String | Item name |
| `category` | Enum | `food`, `fuel`, `medical`, `equipment`, `scientific`, `other` |
| `quantity` | Number | Available inventory quantity |
| `unit` | String | Measurement unit (default: `'units'`) |
| `currentLocation` | Object | `{ stationId, coordinates: { lat, lng }, status }` (status: `warehouse`, `in-transit`, `delivered`, `consumed`) |
| `transitHistory` | Array | `[{ fromStation, toStation, timestamp, handledBy }]` |
| `expiryDate` | Date | Perishable expiration timestamp |
| `criticalThreshold` | Number | Stock reorder trigger level |
| `_synced` | Boolean | Mainland sync status flag (default `false`) |
| `_lastModified` | Date | Last mutation timestamp |
| `_deleted` | Boolean | Soft-deletion flag (default `false`) |

### 2. Personnel (`src/models/Personnel.js`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `personnelId` | String (unique) | Unique personnel identifier |
| `name` | String | Full name |
| `role` | Enum | `scientist`, `engineer`, `medic`, `logistics`, `commander` |
| `medicalClearance` | Object | `{ status ('cleared', 'pending', 'restricted', 'expired'), lastCheckupDate, conditions: [String], bloodGroup }` |
| `trainingStatus` | Array | `[{ trainingType, completedDate, expiryDate, certified }]` |
| `currentLocation` | Object | `{ stationId, lastCheckIn }` |
| `emergencyContact` | Object | `{ name, relation, phone }` |
| `sosStatus` | Enum | `safe`, `emergency`, `unresponsive` (default: `'safe'`) |
| `_synced` | Boolean | Sync status flag (default `false`) |
| `_lastModified` | Date | Mutation timestamp |
| `_deleted` | Boolean | Soft-deletion flag (default `false`) |

### 3. SyncLog (`src/models/SyncLog.js`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `collectionName` | String | Target collection (`Cargo`, `Personnel`, `SOSAlert`) |
| `documentId` | String | Natural key (`itemId`, `personnelId`, `alertId`) |
| `operation` | Enum | `create`, `update`, `delete` |
| `payload` | Mixed | **Delta payload only** (modified fields, not full doc) |
| `pushedToMainland` | Boolean | Flag indicating if pushed to mainland (default `false`) |
| `pushedAt` | Date | Mainland push acknowledgment timestamp |
| `createdAt` | Date | Timestamp log record was generated |

### 4. SOSAlert (`src/models/SOSAlert.js`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `alertId` | String (unique) | Unique emergency alert identifier |
| `raisedBy` | String | Personnel ID reference who raised the alert |
| `stationId` | String | Station outpost where emergency occurred |
| `location` | Object | Coordinates `{ lat, lng }` |
| `severity` | Enum | `low`, `medium`, `critical` |
| `status` | Enum | `active`, `acknowledged`, `resolved` |
| `matchedMedic` | String | Auto-matched medic personnel ID |
| `matchedInventory`| Array | Auto-matched medical cargo `itemId` references |

---

## 📡 REST API Reference

All responses conform to `{ success: true, data: ... }` or `{ success: false, error: ... }`.

### 1. System Health & Dashboard
- `GET /api/health`: Server uptime & MongoDB connection status.
- `GET /api/dashboard/stats`: Returns `{ totalCargo, lowStockCount, activeSOSCount, totalPersonnel, personnelByRole }`.

### 2. Cargo Endpoints (`/api/cargo`)
- `POST /`: Create a cargo item (`_synced=false`, `_lastModified=now`).
- `GET /`: List all cargo items. Supports `?category=` and `?status=`.
- `GET /low-stock`: List items where `quantity <= criticalThreshold`.
- `GET /:itemId`: Retrieve single cargo item.
- `PUT /:itemId`: Update cargo item (automatically sets `_synced=false`, `_lastModified=now`).
- `DELETE /:itemId`: Soft-delete cargo item (`_deleted=true`, `_synced=false`).

### 3. Personnel Endpoints (`/api/personnel`)
- `POST /`: Add personnel record.
- `GET /`: List personnel. Supports `?role=` and `?medicalStatus=`.
- `GET /available-medics`: Query cleared, safe medics (`role=medic`, `medicalClearance.status=cleared`, `sosStatus=safe`).
- `GET /:personnelId`: Get single personnel member.
- `PUT /:personnelId`: Update personnel record (`_synced=false`, `_lastModified=now`).

### 4. Emergency SOS Endpoints (`/api/sos`)
- `POST /`: Raise an SOS alert. Automatically executes:
  1. Finds nearest available medic at same station.
  2. Finds available medical supplies at same station.
  3. Populates `matchedMedic` and `matchedInventory`.
  4. Updates raiser's `sosStatus` to `'emergency'`.
- `GET /`: List active SOS alerts (supports `?status=`).
- `PUT /:alertId/acknowledge`: Marks alert as `acknowledged`.
- `PUT /:alertId/resolve`: Marks alert as `resolved` and resets raiser's `sosStatus` back to `'safe'`.

### 5. Offline-First Sync Endpoints (`/api/sync`)
- `GET /pending`: Returns all documents across Cargo, Personnel, and SOSAlert where `_synced=false`.
- `POST /ack`: Receives `[{ collection, documentId }]`. Marks matching records `_synced=true` and corresponding `SyncLog` entries `pushedToMainland=true`.

---

## 🔄 MongoDB Change Stream Sync Engine

The `changeStreamWatcher` service watches the `Cargo` and `Personnel` collections using MongoDB Replica Set Change Streams:

1. **Delta Detection:** When a document is inserted, updated, or deleted, the change stream triggers immediately.
2. **Selective Delta Extraction:**
   - **Insert:** Stores document creation payload.
   - **Update:** Stores only `change.updateDescription.updatedFields` and `removedFields` (delta payload).
   - **Sync Loop Guard:** If an update only modifies `_synced: true` from mainland acknowledgment, it is ignored to prevent sync loops.
3. **Audit Queue:** Writes to `SyncLog` with `pushedToMainland: false`.
4. **Console Demo Visibility:** Outputs clear real-time terminal logs:
   ```
   [SYNC QUEUE] Cargo item carg-7f2a-4890-8801 queued for mainland (UPDATE)
   ```

---

## 🚀 Quickstart Guide

### Option 1: Run via Docker Compose (Recommended for Production / Evaluation)

Docker Compose configures a single-node MongoDB replica set (`rs0`) and initializes it with healthchecks:

```bash
docker compose up --build
```

The services will start:
- **Node API:** `http://localhost:5000`
- **MongoDB Replica Set:** `mongodb://localhost:27017/polarlink?replicaSet=rs0`

To seed the containerized database:
```bash
docker compose exec app npm run seed
```

### Option 2: Run Locally (Development)

1. Ensure dependencies are installed:
   ```bash
   npm install
   ```

2. Start the local server:
   ```bash
   npm start
   # or with live reload:
   npm run dev
   ```

3. Seed demo data:
   ```bash
   npm run seed
   ```

4. Run the automated integration test suite:
   ```bash
   npm test
   ```

---

## 🧪 Automated Testing

The project includes an in-memory replica set test suite using `mongodb-memory-server` and `supertest`:

```bash
npm test
```

All 16+ integration tests cover:
- System Health & Dashboard statistics
- Cargo CRUD, Category Filters, and Low-Stock detection
- Personnel Registration, Clearances, and Available Medics query
- SOS Emergency Triage, Auto-matching (Medic + Medical Supplies), and Resolution lifecycle
- Offline Sync Engine (Pending extraction, mainland ACK, and Change Stream delta logging)
