const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'system-admin',
    },
    action: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    timestamp: {
      type: String,
      default: () => new Date().toISOString().replace('T', ' ').substring(0, 19),
    },
    status: {
      type: String,
      enum: ['Success', 'Warning', 'Failed'],
      default: 'Success',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
