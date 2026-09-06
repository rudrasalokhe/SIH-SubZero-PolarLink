const mongoose = require('mongoose');

const cargoSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: [true, 'itemId is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'category is required'],
      enum: {
        values: ['food', 'fuel', 'medical', 'equipment', 'scientific', 'other'],
        message: '{VALUE} is not a valid category',
      },
    },
    quantity: {
      type: Number,
      required: [true, 'quantity is required'],
      min: [0, 'quantity cannot be negative'],
    },
    unit: {
      type: String,
      default: 'units',
      trim: true,
    },
    orderedBy: {
      type: String,
      ref: 'Personnel',
      required: [true, 'orderedBy (personnelId) is required'],
      trim: true,
    },
    confirmedBy: {
      type: String,
      ref: 'Personnel',
      default: null,
      trim: true,
    },
    currentLocation: {
      stationId: {
        type: String,
        default: 'station-alpha',
        trim: true,
      },
      coordinates: {
        lat: { type: Number, default: -77.846 },
        lng: { type: Number, default: 166.668 },
      },
      status: {
        type: String,
        enum: {
          values: ['requested', 'warehouse', 'in-transit', 'delivered', 'consumed'],
          message: '{VALUE} is not a valid status',
        },
        default: 'requested',
      },
    },
    transitHistory: [
      {
        fromStation: { type: String, trim: true },
        toStation: { type: String, trim: true },
        timestamp: { type: Date, default: Date.now },
        handledBy: { type: String, trim: true },
      },
    ],
    expiryDate: {
      type: Date,
    },
    criticalThreshold: {
      type: Number,
      default: 10,
    },
    _synced: {
      type: Boolean,
      default: false,
    },
    _lastModified: {
      type: Date,
      default: Date.now,
    },
    _deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

cargoSchema.index({ 'currentLocation.stationId': 1, category: 1, 'currentLocation.status': 1 });
cargoSchema.index({ _synced: 1, _deleted: 1 });

const Cargo = mongoose.model('Cargo', cargoSchema);

module.exports = Cargo;
