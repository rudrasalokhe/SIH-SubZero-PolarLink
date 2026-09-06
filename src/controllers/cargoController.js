const { v4: uuidv4 } = require('uuid');
const Cargo = require('../models/Cargo');

/**
 * @desc Create new cargo item
 * @route POST /api/cargo
 */
const createCargo = async (req, res, next) => {
  try {
    const cargoData = { ...req.body };

    // Auto-generate UUID if not provided by client
    if (!cargoData.itemId) {
      cargoData.itemId = uuidv4();
    }

    cargoData._synced = false;
    cargoData._lastModified = new Date();
    cargoData._deleted = false;

    const cargo = await Cargo.create(cargoData);

    res.status(201).json({
      success: true,
      data: cargo,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get all cargo items with optional filtering by status and category
 * @route GET /api/cargo
 */
const getAllCargo = async (req, res, next) => {
  try {
    const { status, category, includeDeleted } = req.query;
    const filter = {};

    if (!includeDeleted || includeDeleted === 'false') {
      filter._deleted = false;
    }

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter['currentLocation.status'] = status;
    }

    const cargoList = await Cargo.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: cargoList,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get items below or equal to their critical threshold
 * @route GET /api/cargo/low-stock
 */
const getLowStockCargo = async (req, res, next) => {
  try {
    const lowStockItems = await Cargo.find({
      _deleted: false,
      $expr: { $lte: ['$quantity', '$criticalThreshold'] },
    }).sort({ quantity: 1 });

    res.status(200).json({
      success: true,
      data: lowStockItems,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get single cargo item by itemId
 * @route GET /api/cargo/:itemId
 */
const getCargoById = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const cargo = await Cargo.findOne({ itemId, _deleted: false });

    if (!cargo) {
      return res.status(404).json({
        success: false,
        error: `Cargo item with itemId '${itemId}' not found`,
      });
    }

    res.status(200).json({
      success: true,
      data: cargo,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Update cargo item
 * @route PUT /api/cargo/:itemId
 */
const updateCargo = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const updateData = { ...req.body };

    // Prevent overwriting immutable itemId or _id
    delete updateData.itemId;
    delete updateData._id;

    // Enforce offline-sync tracking flags on every write
    updateData._synced = false;
    updateData._lastModified = new Date();

    const updatedCargo = await Cargo.findOneAndUpdate(
      { itemId, _deleted: false },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedCargo) {
      return res.status(404).json({
        success: false,
        error: `Cargo item with itemId '${itemId}' not found or has been deleted`,
      });
    }

    res.status(200).json({
      success: true,
      data: updatedCargo,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Soft delete cargo item
 * @route DELETE /api/cargo/:itemId
 */
const deleteCargo = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const cargo = await Cargo.findOneAndUpdate(
      { itemId, _deleted: false },
      {
        $set: {
          _deleted: true,
          _synced: false,
          _lastModified: new Date(),
        },
      },
      { new: true }
    );

    if (!cargo) {
      return res.status(404).json({
        success: false,
        error: `Cargo item with itemId '${itemId}' not found or already deleted`,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Cargo item soft-deleted successfully',
        itemId: cargo.itemId,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCargo,
  getAllCargo,
  getLowStockCargo,
  getCargoById,
  updateCargo,
  deleteCargo,
};
