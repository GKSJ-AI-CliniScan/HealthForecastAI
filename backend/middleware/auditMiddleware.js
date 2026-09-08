const AuditLog = require('../models/AuditLog');

// Utility function to log actions directly
const logSystemAction = async (user, action, moduleName, status = 'Success', ip = '127.0.0.1') => {
  try {
    const count = await AuditLog.countDocuments();
    const newLog = new AuditLog({
      id: `AL-${count + 5801}`,
      user: typeof user === 'object' ? user.name || user.email : user,
      role: typeof user === 'object' ? user.role : 'system-admin',
      action,
      module: moduleName,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status,
      ipAddress: ip,
    });
    await newLog.save();
  } catch (error) {
    console.error('[Audit Log] Failed to record log:', error.message);
  }
};

module.exports = { logSystemAction };
