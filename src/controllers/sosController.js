const { v4: uuidv4 } = require('uuid');
const SOSAlert = require('../models/SOSAlert');
const Personnel = require('../models/Personnel');
const Cargo = require('../models/Cargo');

/**
 * @desc Raise an SOS alert with automatic medic and medical inventory matching
 * @route POST /api/sos
 */
const raiseSOSAlert = async (req, res, next) => {
  try {
    const raisedBy = (req.user && req.user.personnelId) || req.body.raisedBy;
    const { stationId: inputStationId, location, severity } = req.body;

    if (!raisedBy) {
      return res.status(400).json({
        success: false,
        error: 'raisedBy (personnelId) is required to raise an SOS alert',
      });
    }

    // Verify the personnel raising the alert
    const raiser = await Personnel.findOne({ personnelId: raisedBy, _deleted: false });
    if (!raiser) {
      return res.status(404).json({
        success: false,
        error: `Personnel with ID '${raisedBy}' not found`,
      });
    }

    const stationId = inputStationId || raiser.currentLocation?.stationId || 'station-alpha';

    // 1. Find nearest available medic at the same station
    const matchedMedicDoc = await Personnel.findOne({
      role: 'medic',
      'medicalClearance.status': 'cleared',
      sosStatus: 'safe',
      'currentLocation.stationId': stationId,
      _deleted: false,
    }).sort({ 'currentLocation.lastCheckIn': -1 });

    const matchedMedic = matchedMedicDoc ? matchedMedicDoc.personnelId : null;

    // 2. Find available medical cargo at the same station
    const availableMedicalCargo = await Cargo.find({
      category: 'medical',
      'currentLocation.status': { $ne: 'consumed' },
      'currentLocation.stationId': stationId,
      _deleted: false,
    }).sort({ quantity: -1 });

    const matchedInventory = availableMedicalCargo.map((item) => item.itemId);

    // 3. Create the SOS alert
    const alertId = req.body.alertId || `sos-${uuidv4().substring(0, 8)}`;
    const alert = await SOSAlert.create({
      alertId,
      raisedBy,
      stationId,
      location: location || { lat: -77.846, lng: 166.668 },
      severity: severity || 'critical',
      status: 'active',
      matchedMedic,
      matchedInventory,
      _synced: false,
      _lastModified: new Date(),
      _deleted: false,
    });

    // 4. Set the raising personnel's sosStatus to 'emergency'
    raiser.sosStatus = 'emergency';
    raiser._synced = false;
    raiser._lastModified = new Date();
    await raiser.save();

    console.log(
      `[SOS DISPATCH] Alert ${alertId} raised by ${raiser.name} (${raisedBy}) at ${stationId}. ` +
      `Matched Medic: ${matchedMedic || 'NONE'}, Matched Medical Cargo items: ${matchedInventory.length}`
    );

    res.status(201).json({
      success: true,
      data: alert,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc List SOS alerts (default active)
 * @route GET /api/sos
 */
const getActiveAlerts = async (req, res, next) => {
  try {
    const { status, stationId } = req.query;
    const filter = { _deleted: false };

    if (status) {
      filter.status = status;
    } else {
      // Default to active alerts
      filter.status = 'active';
    }

    if (stationId) {
      filter.stationId = stationId;
    }

    const alerts = await SOSAlert.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Acknowledge an SOS alert
 * @route PUT /api/sos/:alertId/acknowledge
 */
const acknowledgeAlert = async (req, res, next) => {
  try {
    const { alertId } = req.params;

    const alert = await SOSAlert.findOneAndUpdate(
      { alertId, _deleted: false },
      {
        $set: {
          status: 'acknowledged',
          _synced: false,
          _lastModified: new Date(),
        },
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: `SOS Alert with ID '${alertId}' not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Resolve an SOS alert and reset raiser's sosStatus to 'safe'
 * @route PUT /api/sos/:alertId/resolve
 */
const resolveAlert = async (req, res, next) => {
  try {
    const { alertId } = req.params;

    const alert = await SOSAlert.findOneAndUpdate(
      { alertId, _deleted: false },
      {
        $set: {
          status: 'resolved',
          resolvedBy: req.user ? req.user.personnelId : null,
          _synced: false,
          _lastModified: new Date(),
        },
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: `SOS Alert with ID '${alertId}' not found`,
      });
    }

    // Reset raiser's sosStatus back to 'safe'
    if (alert.raisedBy) {
      await Personnel.findOneAndUpdate(
        { personnelId: alert.raisedBy },
        {
          $set: {
            sosStatus: 'safe',
            _synced: false,
            _lastModified: new Date(),
          },
        }
      );
    }

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  raiseSOSAlert,
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
};
