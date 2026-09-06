const Cargo = require('../models/Cargo');
const Personnel = require('../models/Personnel');
const SOSAlert = require('../models/SOSAlert');

/**
 * @desc Get dashboard statistics (total cargo, low stock, active SOS, personnel by role)
 * @route GET /api/dashboard/stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalCargo,
      lowStockCargo,
      activeSOSAlerts,
      personnelByRoleAgg,
      totalPersonnel,
    ] = await Promise.all([
      // Total non-deleted cargo
      Cargo.countDocuments({ _deleted: false }),

      // Cargo below or equal to critical threshold
      Cargo.countDocuments({
        _deleted: false,
        $expr: { $lte: ['$quantity', '$criticalThreshold'] },
      }),

      // Active SOS alerts
      SOSAlert.countDocuments({ status: 'active', _deleted: false }),

      // Personnel grouped by role
      Personnel.aggregate([
        { $match: { _deleted: false } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),

      // Total personnel
      Personnel.countDocuments({ _deleted: false }),
    ]);

    // Format personnel count by role into an intuitive object
    const personnelByRole = {
      scientist: 0,
      engineer: 0,
      medic: 0,
      logistics: 0,
      commander: 0,
    };

    personnelByRoleAgg.forEach((item) => {
      if (item._id) {
        personnelByRole[item._id] = item.count;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalCargo,
        lowStockCount: lowStockCargo,
        activeSOSCount: activeSOSAlerts,
        totalPersonnel,
        personnelByRole,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get mainland Goa HQ overview aggregated across all stations
 * @route GET /api/dashboard/hq-overview
 * @access Private (hq_admin only)
 */
const getHQOverview = async (req, res, next) => {
  try {
    const [totalCargo, totalPersonnel, activeSOSCount] = await Promise.all([
      Cargo.countDocuments({ _deleted: false }),
      Personnel.countDocuments({ _deleted: false }),
      SOSAlert.countDocuments({ status: 'active', _deleted: false }),
    ]);

    // Aggregate cargo by currentLocation.stationId
    const cargoByStation = await Cargo.aggregate([
      { $match: { _deleted: false } },
      {
        $group: {
          _id: '$currentLocation.stationId',
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$_synced', false] }, 1, 0] },
          },
          lastModified: { $max: '$_lastModified' },
          updatedAt: { $max: '$updatedAt' },
        },
      },
    ]);

    // Aggregate personnel by currentLocation.stationId
    const personnelByStation = await Personnel.aggregate([
      { $match: { _deleted: false } },
      {
        $group: {
          _id: '$currentLocation.stationId',
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$_synced', false] }, 1, 0] },
          },
          lastModified: { $max: '$_lastModified' },
          updatedAt: { $max: '$updatedAt' },
        },
      },
    ]);

    const stationMap = new Map();

    const addOrUpdateStation = (stationId, pending, ts) => {
      const id = stationId || 'station-alpha';
      const existing = stationMap.get(id);
      const timestamp = ts ? new Date(ts).toISOString() : new Date().toISOString();

      if (!existing) {
        stationMap.set(id, {
          stationId: id,
          lastSyncTimestamp: timestamp,
          pendingSyncCount: pending || 0,
        });
      } else {
        existing.pendingSyncCount += (pending || 0);
        if (ts && new Date(ts) > new Date(existing.lastSyncTimestamp)) {
          existing.lastSyncTimestamp = timestamp;
        }
      }
    };

    cargoByStation.forEach((item) => {
      addOrUpdateStation(item._id, item.pendingCount, item.lastModified || item.updatedAt);
    });

    personnelByStation.forEach((item) => {
      addOrUpdateStation(item._id, item.pendingCount, item.lastModified || item.updatedAt);
    });

    if (stationMap.size === 0) {
      stationMap.set('station-alpha', {
        stationId: 'station-alpha',
        lastSyncTimestamp: new Date().toISOString(),
        pendingSyncCount: 0,
      });
    }

    const stations = Array.from(stationMap.values());

    res.status(200).json({
      success: true,
      data: {
        totalCargo,
        totalPersonnel,
        activeSOSCount,
        stations,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
  getHQOverview,
};
