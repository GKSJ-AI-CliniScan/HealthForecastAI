// Quick syntax and module integrity check
console.log('--- HealthForecast AI Backend Verification ---');

try {
  const User = require('../models/User');
  const Patient = require('../models/Patient');
  const Encounter = require('../models/Encounter');
  const AuditLog = require('../models/AuditLog');
  const AiModel = require('../models/AiModel');
  const Dataset = require('../models/Dataset');
  console.log('[✓] All 6 Mongoose models loaded successfully.');

  const authController = require('../controllers/authController');
  const patientController = require('../controllers/patientController');
  const analyticsController = require('../controllers/analyticsController');
  const adminController = require('../controllers/adminController');
  console.log('[✓] All 4 MVC controllers loaded successfully.');

  const authRoutes = require('../routes/authRoutes');
  const patientRoutes = require('../routes/patientRoutes');
  const analyticsRoutes = require('../routes/analyticsRoutes');
  const adminRoutes = require('../routes/adminRoutes');
  console.log('[✓] All 4 Express routes configured successfully.');

  const app = require('../server');
  console.log('[✓] Express server instance boots cleanly.');
  console.log('[✓] HealthForecast AI Backend integrity check PASSED!');
} catch (err) {
  console.error('[X] Verification failed:', err);
}
