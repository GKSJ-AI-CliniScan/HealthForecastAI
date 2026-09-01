const mongoose = require('mongoose');

const medicalHistorySchema = new mongoose.Schema({
  id: { type: String, default: '' },
  date: { type: String, default: '' },
  diagnosis: { type: String, default: '' },
  severity: { type: String, default: 'Moderate' },
  hospital: { type: String, default: 'St. Jude Medical Center' }
}, { _id: false });

const clinicalNoteSchema = new mongoose.Schema({
  id: { type: String, default: () => `note_${Date.now()}` },
  doctor: { type: String, default: 'Doctor' },
  note: { type: String, required: true },
  category: { type: String, default: 'General Note' },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const patientSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Please add patient name'],
      trim: true,
    },
    age: {
      type: Number,
      required: [true, 'Please add patient age'],
      min: 0,
      max: 130,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    admissionDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
      required: true,
    },
    dischargeDate: {
      type: String,
      default: null,
    },
    diagnosis: {
      type: String,
      required: [true, 'Please add primary diagnosis'],
      trim: true,
    },
    icd9Code: {
      type: String,
      default: null,
    },
    riskLevel: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    readmissionProbability: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    treatmentStatus: {
      type: String,
      enum: ['Stable', 'Improving', 'Critical', 'Under Observation', 'Discharged'],
      default: 'Stable',
    },
    assignedDoctor: {
      type: String,
      default: 'S.Saumya',
    },
    contact: {
      phone: { type: String, default: '+1 (555) 019-2834' },
      email: { type: String, default: '' },
      address: { type: String, default: 'Seattle, WA' },
    },
    medicalHistory: [medicalHistorySchema],
    clinicalNotes: [clinicalNoteSchema],
    riskFactors: [{ type: String }],
    treatmentHistory: [{ type: String }],
    recoveryProgress: {
      score: { type: Number, default: 70 },
      medicationAdherence: { type: String, default: 'Good' },
      comorbiditiesCount: { type: Number, default: 1 },
      bpReading: { type: String, default: '120/80 mmHg' },
    },
    clinicalInsights: {
      riskMitigation: { type: String, default: 'Awaiting clinical risk evaluation.' },
      careRecommendations: { type: String, default: 'Follow standard care procedures.' },
      followUpPlanning: { type: String, default: 'Schedule follow-up within 14 days.' },
      dischargeRecommendations: { type: String, default: 'Monitor vital signs daily.' },
    },
    hba1cResult: {
      type: String,
      enum: ['>8', '>7', 'Norm', 'None', null],
      default: null,
    },
    glucoseSerum: {
      type: String,
      enum: ['>200', '>300', 'Norm', 'None', null],
      default: null,
    },
    diabetesMed: {
      type: Boolean,
      default: true,
    },
    changeMed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Patient', patientSchema);
