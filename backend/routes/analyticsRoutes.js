const express = require('express');
const router = express.Router();
const {
  getHospitalDashboard,
  getResearchAnalytics,
} = require('../controllers/analyticsController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get(
  '/hospital-dashboard',
  protect,
  authorizeRoles('hospital-admin', 'system-admin', 'doctor'),
  getHospitalDashboard
);

router.get(
  '/research',
  protect,
  authorizeRoles('researcher', 'system-admin'),
  getResearchAnalytics
);

module.exports = router;
