const Cargo = require('../models/Cargo');
const Personnel = require('../models/Personnel');
const SyncLog = require('../models/SyncLog');

/**
 * Extracts a human-readable identifier and delta payload from change stream event
 */
function extractChangeDetails(collectionName, change) {
  const operationType = change.operationType;
  let documentId = '';
  let operation = 'update';
  let deltaPayload = {};

  const fullDoc = change.fullDocument || {};

  if (collectionName === 'Cargo') {
    documentId = fullDoc.itemId || (change.documentKey && change.documentKey._id ? change.documentKey._id.toString() : 'unknown');
  } else if (collectionName === 'Personnel') {
    documentId = fullDoc.personnelId || (change.documentKey && change.documentKey._id ? change.documentKey._id.toString() : 'unknown');
  } else {
    documentId = change.documentKey && change.documentKey._id ? change.documentKey._id.toString() : 'unknown';
  }

  if (operationType === 'insert') {
    operation = 'create';
    // For creates, payload contains document data without internal mongo fields
    const { _id, __v, ...rest } = fullDoc;
    deltaPayload = rest;
  } else if (operationType === 'update') {
    operation = 'update';
    deltaPayload = {
      updatedFields: change.updateDescription?.updatedFields || {},
      removedFields: change.updateDescription?.removedFields || [],
    };
  } else if (operationType === 'replace') {
    operation = 'update';
    const { _id, __v, ...rest } = fullDoc;
    deltaPayload = rest;
  } else if (operationType === 'delete') {
    operation = 'delete';
    deltaPayload = { documentKey: change.documentKey };
  }

  return { documentId, operation, deltaPayload };
}

/**
 * Watches a collection for changes and writes delta entries to SyncLog
 */
function watchCollection(Model, collectionName) {
  try {
    const changeStream = Model.watch([], { fullDocument: 'updateLookup' });

    changeStream.on('change', async (change) => {
      try {
        // If an update only modifies _synced flag to true (e.g. from /ack), do not re-queue to SyncLog
        if (change.operationType === 'update' && change.updateDescription) {
          const updatedFields = Object.keys(change.updateDescription.updatedFields || {});
          if (
            updatedFields.length > 0 &&
            updatedFields.every((field) => field === '_synced' || field === '_lastModified') &&
            change.updateDescription.updatedFields._synced === true
          ) {
            // Already synced, skip logging to sync queue
            return;
          }
        }

        const { documentId, operation, deltaPayload } = extractChangeDetails(collectionName, change);

        // Record into SyncLog
        await SyncLog.create({
          collectionName,
          documentId,
          operation,
          payload: deltaPayload,
          pushedToMainland: false,
          createdAt: new Date(),
        });

        console.log(
          `[SYNC QUEUE] ${collectionName} item ${documentId} queued for mainland (${operation.toUpperCase()})`
        );
      } catch (err) {
        console.error(`[SYNC QUEUE ERROR] Failed to record SyncLog for ${collectionName}:`, err.message);
      }
    });

    changeStream.on('error', (err) => {
      if (err.message && err.message.includes('replica sets')) {
        console.warn(
          `[SYNC SERVICE WARNING] Change streams require a MongoDB replica set. SyncLog streaming is inactive on standalone MongoDB instance: ${err.message}`
        );
      } else {
        console.error(`[SYNC SERVICE ERROR] Change stream error on ${collectionName}:`, err.message);
      }
    });

    return changeStream;
  } catch (err) {
    console.warn(`[SYNC SERVICE WARNING] Could not attach change stream to ${collectionName}:`, err.message);
    return null;
  }
}

let activeWatchers = [];

/**
 * Initializes MongoDB Change Stream watchers on Cargo and Personnel collections
 */
function startWatchers() {
  console.log('[SYNC SERVICE] Initializing MongoDB Change Stream watchers...');
  const cargoWatcher = watchCollection(Cargo, 'Cargo');
  const personnelWatcher = watchCollection(Personnel, 'Personnel');

  activeWatchers = [cargoWatcher, personnelWatcher].filter(Boolean);
  return activeWatchers;
}

/**
 * Closes active watchers (useful for testing or graceful shutdown)
 */
async function stopWatchers() {
  for (const watcher of activeWatchers) {
    try {
      if (watcher && typeof watcher.close === 'function') {
        await watcher.close();
      }
    } catch (e) {
      // ignore
    }
  }
  activeWatchers = [];
}

module.exports = {
  startWatchers,
  stopWatchers,
  extractChangeDetails,
};
