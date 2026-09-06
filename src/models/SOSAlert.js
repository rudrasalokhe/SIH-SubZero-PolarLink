const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: [true, 'alertId is required'],
      unique: true,
      trim: true,
    },
    raisedBy: {
      type: String,
      ref: 'Personnel',
      required: [true, 'raisedBy (personnelId) is required'],
      trim: true,
    },
    stationId: {
      type: String,
      required: [true, 'stationId is required'],
      trim: true,
    },
    location: {
      lat: { type: Number, default: -77.846 },
      lng: { type: Number, default: 166.668 },
    },
    severity: {
      type: String,
      enum: {
        values: ['low', 'medium', 'critical'],
        message: '{VALUE} is not a valid severity level',
      },
      default: 'critical',
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'acknowledged', 'resolved'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
    },
    matchedMedic: {
      type: String,
      ref: 'Personnel',
      default: null,
    },
    matchedInventory: [
      {
        type: String,
        ref: 'Cargo',
      },
    ],
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

sosAlertSchema.index({ status: 1, stationId: 1 });
sosAlertSchema.index({ _synced: 1, _deleted: 1 });

const SOSAlert = mongoose.model('SOSAlert', sosAlertSchema);

module.exports = SOSAlert;
