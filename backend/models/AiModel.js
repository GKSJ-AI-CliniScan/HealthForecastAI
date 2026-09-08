const mongoose = require('mongoose');

const aiModelSchema = new mongoose.Schema(
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
    type: {
      type: String,
      default: 'Classification',
    },
    version: {
      type: String,
      default: 'v1.0',
    },
    accuracy: {
      type: Number,
      required: true,
    },
    f1Score: {
      type: Number,
      required: true,
    },
    aucRoc: {
      type: Number,
      default: 0.85,
    },
    status: {
      type: String,
      default: 'Active (Deployed)',
    },
    lastTrained: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AiModel', aiModelSchema);
