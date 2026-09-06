const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  collectionName: {
    type: String,
    required: [true, 'collectionName is required'],
    trim: true,
  },
  documentId: {
    type: String,
    required: [true, 'documentId is required'],
    trim: true,
  },
  operation: {
    type: String,
    required: [true, 'operation is required'],
    enum: {
      values: ['create', 'update', 'delete'],
      message: '{VALUE} is not a valid operation',
    },
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  pushedToMainland: {
    type: Boolean,
    default: false,
  },
  pushedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

syncLogSchema.index({ collectionName: 1, documentId: 1 });
syncLogSchema.index({ pushedToMainland: 1, createdAt: 1 });

const SyncLog = mongoose.model('SyncLog', syncLogSchema);

module.exports = SyncLog;
