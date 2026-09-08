const express = require('express');
const router = express.Router();
const {
  getSystemStats,
  getUsers,
  createUser,
  toggleUserStatus,
  updateUserRole,
  getAuditLogs,
  getDatasets,
  uploadDataset,
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// System Admin specific routes
router.use(protect);

router.get('/dashboard', authorizeRoles('system-admin'), getSystemStats);
router.get('/users', authorizeRoles('system-admin'), getUsers);
router.post('/users', authorizeRoles('system-admin'), createUser);
router.put('/users/:id/status', authorizeRoles('system-admin'), toggleUserStatus);
router.put('/users/:id/role', authorizeRoles('system-admin'), updateUserRole);
router.get('/audit-logs', authorizeRoles('system-admin'), getAuditLogs);
router.get('/datasets', authorizeRoles('system-admin', 'researcher'), getDatasets);
router.post('/datasets', authorizeRoles('system-admin', 'researcher'), uploadDataset);

module.exports = router;
