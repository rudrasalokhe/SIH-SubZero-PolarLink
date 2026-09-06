const Cargo = require('../models/Cargo');
const Personnel = require('../models/Personnel');
const SOSAlert = require('../models/SOSAlert');
const SyncLog = require('../models/SyncLog');

/**
 * @desc Return all documents across Cargo + Personnel where _synced=false
 * @route GET /api/sync/pending
 */
const getPendingSync = async (req, res, next) => {
  try {
    const pendingCargo = await Cargo.find({ _synced: false }).lean();
    const pendingPersonnel = await Personnel.find({ _synced: false }).lean();
    const pendingSOS = await SOSAlert.find({ _synced: false }).lean();

    const pendingLogs = await SyncLog.find({ pushedToMainland: false })
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        cargo: pendingCargo,
        personnel: pendingPersonnel,
        sosAlerts: pendingSOS,
        syncLogs: pendingLogs,
        totalPending: pendingCargo.length + pendingPersonnel.length + pendingSOS.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Accept array of {collection, documentId} and mark them _synced=true and SyncLog entries pushedToMainland=true
 * @route POST /api/sync/ack
 */
const acknowledgeSync = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'An array of items [{ collection, documentId }] is required',
      });
    }

    const now = new Date();
    let ackCount = 0;

    for (const item of items) {
      const collection = (item.collection || item.collectionName || '').toLowerCase();
      const documentId = item.documentId || item.id;

      if (!collection || !documentId) continue;

      if (collection === 'cargo') {
        await Cargo.updateOne(
          { itemId: documentId },
          { $set: { _synced: true, _lastModified: now } }
        );
        await SyncLog.updateMany(
          { collectionName: 'Cargo', documentId, pushedToMainland: false },
          { $set: { pushedToMainland: true, pushedAt: now } }
        );
        ackCount++;
      } else if (collection === 'personnel') {
        await Personnel.updateOne(
          { personnelId: documentId },
          { $set: { _synced: true, _lastModified: now } }
        );
        await SyncLog.updateMany(
          { collectionName: 'Personnel', documentId, pushedToMainland: false },
          { $set: { pushedToMainland: true, pushedAt: now } }
        );
        ackCount++;
      } else if (collection === 'sosalert' || collection === 'sos') {
        await SOSAlert.updateOne(
          { alertId: documentId },
          { $set: { _synced: true, _lastModified: now } }
        );
        await SyncLog.updateMany(
          { collectionName: 'SOSAlert', documentId, pushedToMainland: false },
          { $set: { pushedToMainland: true, pushedAt: now } }
        );
        ackCount++;
      }
    }

    console.log(`[SYNC ACK] Acknowledged ${ackCount} records from mainland push.`);

    res.status(200).json({
      success: true,
      data: {
        acknowledgedCount: ackCount,
        acknowledgedAt: now,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPendingSync,
  acknowledgeSync,
};
