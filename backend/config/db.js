const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const AuditLog = require('../models/AuditLog');
const Dataset = require('../models/Dataset');
const { seedUsers, seedPatients, seedDatasets, seedAuditLogs } = require('../utils/seeder');

const autoSeedIfEmpty = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[MongoDB] Empty database detected. Auto-seeding initial users and clinical cohorts...');
      for (const u of seedUsers) {
        await User.create(u);
      }
      console.log(`[MongoDB] Auto-seeded ${seedUsers.length} default user accounts (Doctor, Hospital Admin, Researcher, SysAdmin).`);
    }

    const patientCount = await Patient.countDocuments();
    if (patientCount === 0) {
      await Patient.insertMany(seedPatients);
      console.log(`[MongoDB] Auto-seeded ${seedPatients.length} clinical patient worksheets.`);
    }

    const datasetCount = await Dataset.countDocuments();
    if (datasetCount === 0) {
      await Dataset.insertMany(seedDatasets);
    }

    const auditCount = await AuditLog.countDocuments();
    if (auditCount === 0) {
      await AuditLog.insertMany(seedAuditLogs);
    }
  } catch (seedErr) {
    console.error('[MongoDB] Auto-seed note:', seedErr.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/healthforecast', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    
    // Auto-seed database if empty on startup
    await autoSeedIfEmpty();
    
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection Warning: ${error.message}`);
    console.log('[MongoDB] Running in graceful resilience mode. Make sure local MongoDB or Mongo Atlas is running.');
    return null;
  }
};

module.exports = connectDB;
