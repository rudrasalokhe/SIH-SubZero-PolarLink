const mongoose = require('mongoose');

const personnelSchema = new mongoose.Schema(
  {
    personnelId: {
      type: String,
      required: [true, 'personnelId is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'passwordHash is required'],
    },
    role: {
      type: String,
      required: [true, 'role is required'],
      enum: {
        values: ['scientist', 'engineer', 'medic', 'logistics', 'commander', 'hq_admin'],
        message: '{VALUE} is not a valid role',
      },
    },
    medicalClearance: {
      status: {
        type: String,
        enum: {
          values: ['cleared', 'pending', 'restricted', 'expired'],
          message: '{VALUE} is not a valid medical clearance status',
        },
        default: 'pending',
      },
      lastCheckupDate: {
        type: Date,
      },
      conditions: {
        type: [String],
        default: [],
      },
      bloodGroup: {
        type: String,
        trim: true,
      },
    },
    trainingStatus: [
      {
        trainingType: { type: String, trim: true },
        completedDate: { type: Date },
        expiryDate: { type: Date },
        certified: { type: Boolean, default: false },
      },
    ],
    currentLocation: {
      stationId: {
        type: String,
        default: 'station-alpha',
        trim: true,
      },
      lastCheckIn: {
        type: Date,
        default: Date.now,
      },
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    sosStatus: {
      type: String,
      enum: {
        values: ['safe', 'emergency', 'unresponsive'],
        message: '{VALUE} is not a valid sosStatus',
      },
      default: 'safe',
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

personnelSchema.index({ role: 1, 'medicalClearance.status': 1, sosStatus: 1, 'currentLocation.stationId': 1 });
personnelSchema.index({ _synced: 1, _deleted: 1 });

const Personnel = mongoose.model('Personnel', personnelSchema);

module.exports = Personnel;
