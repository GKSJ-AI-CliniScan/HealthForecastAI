const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    version: {
      type: String,
      default: 'v1.0',
    },
    recordsCount: {
      type: Number,
      required: true,
    },
    format: {
      type: String,
      default: 'CSV',
    },
    status: {
      type: String,
      default: 'Active',
    },
    lastUpdated: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Dataset', datasetSchema);
