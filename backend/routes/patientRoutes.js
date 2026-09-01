const express = require('express');
const router = express.Router();
const {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  addClinicalNote,
  addTreatment,
  deletePatient,
  getDoctorPatients,
} = require('../controllers/patientController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, getPatients)
  .post(protect, authorizeRoles('doctor', 'hospital-admin', 'system-admin'), createPatient);

router.get('/doctor/:doctorName', protect, getDoctorPatients);

router
  .route('/:id')
  .get(protect, getPatientById)
  .put(protect, authorizeRoles('doctor', 'hospital-admin', 'system-admin'), updatePatient)
  .delete(protect, authorizeRoles('hospital-admin', 'system-admin'), deletePatient);

router.post('/:id/notes', protect, authorizeRoles('doctor', 'hospital-admin', 'system-admin'), addClinicalNote);
router.post('/:id/treatments', protect, authorizeRoles('doctor', 'hospital-admin', 'system-admin'), addTreatment);

module.exports = router;
