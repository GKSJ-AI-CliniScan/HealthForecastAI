const mongoose = require('mongoose');

const encounterSchema = new mongoose.Schema(
  {
    encounterId: {
      type: String,
      required: true,
      unique: true,
    },
    patientId: {
      type: String,
      required: true,
      ref: 'Patient',
    },
    admissionType: {
      type: String,
      enum: ['Emergency', 'Elective', 'Urgent', 'Trauma', 'Newborn'],
      default: 'Emergency',
    },
    admissionSource: {
      type: String,
      default: 'Physician Referral',
    },
    timeInHospital: {
      type: Number, // In days
      required: true,
      min: 1,
    },
    numLabProcedures: {
      type: Number,
      default: 0,
    },
    numProcedures: {
      type: Number,
      default: 0,
    },
    numMedications: {
      type: Number,
      default: 0,
    },
    numberOutpatient: {
      type: Number,
      default: 0,
    },
    numberEmergency: {
      type: Number,
      default: 0,
    },
    numberInpatient: {
      type: Number,
      default: 0,
    },
    primaryDiagnosisIcd9: {
      type: String,
      default: '',
    },
    secondaryDiagnosisIcd9: {
      type: String,
      default: '',
    },
    additionalDiagnosisIcd9: {
      type: String,
      default: '',
    },
    numberDiagnoses: {
      type: Number,
      default: 1,
    },
    maxGluSerum: {
      type: String,
      enum: ['>200', '>300', 'Norm', 'None'],
      default: 'None',
    },
    a1cResult: {
      type: String,
      enum: ['>8', '>7', 'Norm', 'None'],
      default: 'None',
    },
    metformin: {
      type: String,
      enum: ['No', 'Steady', 'Up', 'Down'],
      default: 'No',
    },
    insulin: {
      type: String,
      enum: ['No', 'Steady', 'Up', 'Down'],
      default: 'No',
    },
    change: {
      type: String,
      enum: ['Ch', 'No'],
      default: 'No',
    },
    diabetesMed: {
      type: String,
      enum: ['Yes', 'No'],
      default: 'No',
    },
    readmitted30Days: {
      type: Boolean,
      default: false,
    },
    readmissionClass: {
      type: String,
      enum: ['<30', '>30', 'NO'],
      default: 'NO',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Encounter', encounterSchema);
