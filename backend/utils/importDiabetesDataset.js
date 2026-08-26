require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Encounter = require('../models/Encounter');

const requiredColumns = [
  'encounter_id', 'patient_nbr', 'admission_type_id', 'time_in_hospital',
  'num_lab_procedures', 'num_medications', 'number_diagnoses', 'diag_1',
  'A1Cresult', 'insulin', 'readmitted',
];

const parseCsvLine = (line) => {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
};

const normalize = (value) => value.trim().replace(/^"|"$/g, '');

const readCsv = (filePath) => {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('Dataset must contain a header and at least one record');
  const headers = parseCsvLine(lines[0]).map(normalize);
  const missing = requiredColumns.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Dataset is missing required columns: ${missing.join(', ')}`);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line).map(normalize);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
};

const numberOr = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const mapEncounter = (row) => {
  const readmissionClass = row.readmitted || 'NO';
  const admissionTypes = { '1': 'Emergency', '2': 'Urgent', '3': 'Elective' };
  return {
    encounterId: row.encounter_id,
    patientId: row.patient_nbr,
    admissionType: admissionTypes[row.admission_type_id] || 'Emergency',
    timeInHospital: Math.max(1, numberOr(row.time_in_hospital, 1)),
    numLabProcedures: numberOr(row.num_lab_procedures, 0),
    numMedications: numberOr(row.num_medications, 0),
    numberDiagnoses: numberOr(row.number_diagnoses, 1),
    primaryDiagnosisIcd9: row.diag_1,
    a1cResult: ['>8', '>7', 'Norm', 'None'].includes(row.A1Cresult) ? row.A1Cresult : 'None',
    insulin: ['No', 'Steady', 'Up', 'Down'].includes(row.insulin) ? row.insulin : 'No',
    readmitted30Days: readmissionClass === '<30',
    readmissionClass,
  };
};

const importDataset = async (filePath) => {
  const rows = readCsv(filePath);
  const encounters = rows.map(mapEncounter);
  await Encounter.bulkWrite(encounters.map((encounter) => ({
    updateOne: { filter: { encounterId: encounter.encounterId }, update: { $set: encounter }, upsert: true },
  })), { ordered: false });
  return encounters.length;
};

if (require.main === module) {
  const filePath = process.argv[2] || path.join(__dirname, '..', 'data', 'diabetic_data.csv');
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/healthforecast';
  mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
    .then(() => importDataset(filePath))
    .then((count) => console.log(`[Dataset Import] Imported ${count} Diabetes 130-US Hospitals encounters.`))
    .catch((error) => {
      console.error(`[Dataset Import] ${error.message}`);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = { importDataset, mapEncounter, readCsv, requiredColumns };
