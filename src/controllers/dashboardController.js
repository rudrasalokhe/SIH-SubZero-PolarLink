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

module.exports = {
  getDashboardStats,
};
