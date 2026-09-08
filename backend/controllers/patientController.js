const Patient = require('../models/Patient');
const { logSystemAction } = require('../middleware/auditMiddleware');

// Helper to generate safe sequential or unique ID
const generateUniquePatientId = async () => {
  const allPatients = await Patient.find({}, 'id');
  let maxNum = 0;
  for (const p of allPatients) {
    if (p.id && p.id.startsWith('HFC-')) {
      const num = parseInt(p.id.replace('HFC-', ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  return `HFC-${String(nextNum).padStart(3, '0')}`;
};

// @desc    Get all patients with filtering, search, and pagination
// @route   GET /api/v1/patients
// @access  Private (Doctor, Hospital Admin, System Admin)
const getPatients = async (req, res) => {
  try {
    const { search, riskLevel, doctor, treatmentStatus } = req.query;

    const query = {};

    if (riskLevel && riskLevel !== 'All') {
      query.riskLevel = riskLevel;
    }

    if (treatmentStatus && treatmentStatus !== 'All') {
      query.treatmentStatus = treatmentStatus;
    }

    if (doctor && doctor !== 'All') {
      query.assignedDoctor = { $regex: new RegExp(doctor, 'i') };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } },
      ];
    }

    const patients = await Patient.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: patients.length,
      data: patients,
    });
  } catch (error) {
    console.error('[Patient Controller] Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving patients list',
    });
  }
};

// @desc    Get single patient by ID
// @route   GET /api/v1/patients/:id
// @access  Private
const getPatientById = async (req, res) => {
  try {
    const paramId = req.params.id;
    let patient = await Patient.findOne({ id: paramId });

    if (!patient && paramId.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(paramId);
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient with ID ${paramId} not found`,
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error retrieving patient details',
    });
  }
};

// @desc    Create new patient
// @route   POST /api/v1/patients
// @access  Private (Doctor, Hospital Admin, System Admin)
const createPatient = async (req, res) => {
  try {
    const generatedId = await generateUniquePatientId();
    const today = new Date().toISOString().split('T')[0];

    const newPatientData = {
      ...req.body,
      id: req.body.id || generatedId,
      admissionDate: req.body.admissionDate || today,
      assignedDoctor: req.body.assignedDoctor || (req.user ? req.user.name : 'S.Saumya'),
      contact: req.body.contact || {
        phone: req.body.phone || '+1 (555) 019-2834',
        email: req.body.email || `${(req.body.name || 'patient').toLowerCase().replace(/\s+/g, '.')}@patientmail.com`,
        address: req.body.address || 'Seattle, WA',
      },
      treatmentHistory: req.body.treatmentHistory || [
        `Initial assessment on admission (${req.body.diagnosis || 'General'})`,
      ],
      medicalHistory: req.body.medicalHistory || [],
      clinicalNotes: req.body.clinicalNotes || [
        {
          id: `note_${Date.now()}`,
          doctor: req.user ? req.user.name : 'Attending Clinician',
          note: `Patient admitted for ${req.body.diagnosis || 'treatment'}. Baseline vitals recorded.`,
          category: 'Admission Note',
          date: today,
        },
      ],
      clinicalInsights: req.body.clinicalInsights || {
        riskMitigation: 'Awaiting clinical risk evaluation.',
        careRecommendations: 'Follow standard operational cardiorespiratory check-list.',
        followUpPlanning: 'Schedule outpatient triage check within 14 days.',
        dischargeRecommendations: 'Monitor vital signs and check-in daily.',
      },
    };

    const patient = await Patient.create(newPatientData);

    await logSystemAction(
      req.user ? req.user.name : 'Clinician',
      `Registered new patient: ${patient.name} (${patient.id})`,
      'Patient Management',
      'Success',
      req.ip
    );

    res.status(201).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error('[Patient Controller] Error creating patient:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create patient',
    });
  }
};

// @desc    Update patient record & clinical notes
// @route   PUT /api/v1/patients/:id
// @access  Private (Doctor, Hospital Admin, System Admin)
const updatePatient = async (req, res) => {
  try {
    const paramId = req.params.id;
    let patient = await Patient.findOne({ id: paramId });

    if (!patient && paramId.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(paramId);
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient with ID ${paramId} not found`,
      });
    }

    Object.assign(patient, req.body);
    const updatedPatient = await patient.save();

    await logSystemAction(
      req.user ? req.user.name : 'Clinician',
      `Updated clinical records for patient: ${patient.name} (${patient.id})`,
      'Clinical Care',
      'Success',
      req.ip
    );

    res.json({
      success: true,
      data: updatedPatient,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update patient',
    });
  }
};

// @desc    Add clinical note to patient
// @route   POST /api/v1/patients/:id/notes
// @access  Private (Doctor, Hospital Admin)
const addClinicalNote = async (req, res) => {
  try {
    const paramId = req.params.id;
    let patient = await Patient.findOne({ id: paramId });

    if (!patient && paramId.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(paramId);
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient with ID ${paramId} not found`,
      });
    }

    const newNote = {
      id: `note_${Date.now()}`,
      doctor: req.user ? req.user.name : (req.body.doctor || 'Doctor'),
      note: req.body.note,
      category: req.body.category || 'Progress Note',
      date: req.body.date || new Date().toISOString().split('T')[0],
      createdAt: new Date(),
    };

    if (!patient.clinicalNotes) {
      patient.clinicalNotes = [];
    }

    patient.clinicalNotes.unshift(newNote);
    await patient.save();

    await logSystemAction(
      req.user ? req.user.name : 'Clinician',
      `Added clinical note for patient: ${patient.name} (${patient.id})`,
      'Clinical Care',
      'Success',
      req.ip
    );

    res.status(201).json({
      success: true,
      data: patient,
      note: newNote,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add clinical note',
    });
  }
};

// @desc    Add treatment / medication to patient
// @route   POST /api/v1/patients/:id/treatments
// @access  Private (Doctor)
const addTreatment = async (req, res) => {
  try {
    const paramId = req.params.id;
    let patient = await Patient.findOne({ id: paramId });

    if (!patient && paramId.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(paramId);
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient with ID ${paramId} not found`,
      });
    }

    const { treatment } = req.body;
    if (!treatment) {
      return res.status(400).json({ success: false, message: 'Treatment description is required' });
    }

    if (!patient.treatmentHistory) {
      patient.treatmentHistory = [];
    }

    patient.treatmentHistory.push(treatment);
    await patient.save();

    res.status(201).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add treatment',
    });
  }
};

// @desc    Delete patient
// @route   DELETE /api/v1/patients/:id
// @access  Private (Admin only)
const deletePatient = async (req, res) => {
  try {
    const paramId = req.params.id;
    let patient = await Patient.findOneAndDelete({ id: paramId });

    if (!patient && paramId.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findByIdAndDelete(paramId);
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient with ID ${paramId} not found`,
      });
    }

    await logSystemAction(
      req.user ? req.user.name : 'System Admin',
      `Deleted patient record: ${patient.name} (${patient.id})`,
      'Patient Management',
      'Warning',
      req.ip
    );

    res.json({
      success: true,
      message: `Patient ${patient.name} (${patient.id}) deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error deleting patient',
    });
  }
};

// @desc    Get patients assigned to a specific doctor
// @route   GET /api/v1/patients/doctor/:doctorName
// @access  Private
const getDoctorPatients = async (req, res) => {
  try {
    const doctorName = decodeURIComponent(req.params.doctorName);
    let patients = await Patient.find({
      assignedDoctor: { $regex: new RegExp(doctorName, 'i') },
    });

    if (patients.length === 0) {
      patients = await Patient.find().limit(10);
    }

    res.json({
      success: true,
      count: patients.length,
      data: patients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error retrieving doctor patients',
    });
  }
};

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  addClinicalNote,
  addTreatment,
  deletePatient,
  getDoctorPatients,
};
