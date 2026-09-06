const { v4: uuidv4 } = require('uuid');
const Personnel = require('../models/Personnel');

/**
 * @desc Add new personnel
 * @route POST /api/personnel
 */
const createPersonnel = async (req, res, next) => {
  try {
    const personnelData = { ...req.body };

    if (!personnelData.personnelId) {
      personnelData.personnelId = `pers-${uuidv4().substring(0, 8)}`;
    }

    personnelData._synced = false;
    personnelData._lastModified = new Date();
    personnelData._deleted = false;

    const personnel = await Personnel.create(personnelData);

    res.status(201).json({
      success: true,
      data: personnel,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get all personnel with optional filters (role, medicalClearance.status)
 * @route GET /api/personnel
 */
const getAllPersonnel = async (req, res, next) => {
  try {
    const { role, 'medicalClearance.status': medStatus, medicalStatus, includeDeleted } = req.query;
    const filter = {};

    if (!includeDeleted || includeDeleted === 'false') {
      filter._deleted = false;
    }

    if (role) {
      filter.role = role;
    }

    const clearanceStatus = medStatus || medicalStatus;
    if (clearanceStatus) {
      filter['medicalClearance.status'] = clearanceStatus;
    }

    const personnelList = await Personnel.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: personnelList,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get available medics (role=medic AND medicalClearance.status=cleared AND sosStatus=safe)
 * @route GET /api/personnel/available-medics
 */
const getAvailableMedics = async (req, res, next) => {
  try {
    const { stationId } = req.query;
    const filter = {
      role: 'medic',
      'medicalClearance.status': 'cleared',
      sosStatus: 'safe',
      _deleted: false,
    };

    if (stationId) {
      filter['currentLocation.stationId'] = stationId;
    }

    const medics = await Personnel.find(filter).sort({ 'currentLocation.lastCheckIn': -1 });

    res.status(200).json({
      success: true,
      data: medics,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get single personnel by personnelId
 * @route GET /api/personnel/:personnelId
 */
const getPersonnelById = async (req, res, next) => {
  try {
    const { personnelId } = req.params;
    const personnel = await Personnel.findOne({ personnelId, _deleted: false });

    if (!personnel) {
      return res.status(404).json({
        success: false,
        error: `Personnel with ID '${personnelId}' not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: personnel,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Update personnel
 * @route PUT /api/personnel/:personnelId
 */
const updatePersonnel = async (req, res, next) => {
  try {
    const { personnelId } = req.params;
    const updateData = { ...req.body };

    // Disallow overwriting immutable IDs
    delete updateData.personnelId;
    delete updateData._id;

    updateData._synced = false;
    updateData._lastModified = new Date();

    const updated = await Personnel.findOneAndUpdate(
      { personnelId, _deleted: false },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Personnel with ID '${personnelId}' not found or deleted`,
      });
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Update personnel GPS location
 * @route PUT /api/personnel/:personnelId/location
 * @access Private (own location only, unless commander/hq_admin)
 */
const updateLocation = async (req, res, next) => {
  try {
    const { personnelId } = req.params;
    const { lat, lng } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required',
      });
    }

    // Ownership check: user can only update their own location
    // Commander and hq_admin can update anyone's (manual override / testing)
    const callerRole = req.user?.role;
    const callerId = req.user?.personnelId;
    const isPrivileged = callerRole === 'commander' || callerRole === 'hq_admin';

    if (!isPrivileged && callerId !== personnelId) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own location',
      });
    }

    const updated = await Personnel.findOneAndUpdate(
      { personnelId, _deleted: false },
      {
        $set: {
          'currentLocation.coordinates.lat': lat,
          'currentLocation.coordinates.lng': lng,
          'currentLocation.lastLocationUpdate': new Date(),
          _synced: false,
          _lastModified: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Personnel '${personnelId}' not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        personnelId: updated.personnelId,
        coordinates: updated.currentLocation.coordinates,
        lastLocationUpdate: updated.currentLocation.lastLocationUpdate,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPersonnel,
  getAllPersonnel,
  getAvailableMedics,
  getPersonnelById,
  updatePersonnel,
  updateLocation,
};
