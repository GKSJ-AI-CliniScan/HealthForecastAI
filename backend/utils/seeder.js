require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Encounter = require('../models/Encounter');
const AuditLog = require('../models/AuditLog');
const AiModel = require('../models/AiModel');
const Dataset = require('../models/Dataset');

const seedUsers = [
  {
    userId: 'U-101',
    email: 'doctor@healthforecast.ai',
    password: 'password123',
    name: 'S.Saumya',
    role: 'doctor',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150',
    specialty: 'Cardiology & Endocrinology',
    assignedPatientsCount: 8,
    active: true,
  },
  {
    userId: 'U-102',
    email: 'admin@healthforecast.ai',
    password: 'password123',
    name: 'Rambilas Sah',
    role: 'hospital-admin',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    department: 'Hospital Administration',
    hospitalBranch: 'St. Jude Medical Center',
    active: true,
  },
  {
    userId: 'U-103',
    email: 'researcher@healthforecast.ai',
    password: 'password123',
    name: 'K.Deepak Raja',
    role: 'researcher',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150',
    institution: 'Health Analytics Institute & Research Labs',
    active: true,
  },
  {
    userId: 'U-104',
    email: 'sysadmin@healthforecast.ai',
    password: 'prasad1234',
    name: 'Penchala Prasad',
    role: 'system-admin',
    avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=150',
    clearance: 'Level 5 (Super Admin)',
    active: true,
  },
];

const seedPatients = [
  {
    id: 'HFC-001',
    name: 'Marcus Vance',
    age: 68,
    gender: 'Male',
    admissionDate: '2026-08-12',
    dischargeDate: '2026-08-20',
    diagnosis: 'Type 2 Diabetes & Chronic Renal Failure',
    riskLevel: 'High',
    readmissionProbability: 82,
    treatmentStatus: 'Stable',
    assignedDoctor: 'S.Saumya',
    contact: {
      phone: '+1 (555) 234-5678',
      email: 'marcus.vance@email.com',
      address: '1042 Maple Dr, Seattle, WA',
    },
    medicalHistory: [
      { id: 'MH-011', date: '2026-03-14', diagnosis: 'Hypoglycemic Episode', severity: 'Moderate', hospital: 'St. Jude Medical Center' },
      { id: 'MH-012', date: '2025-11-02', diagnosis: 'Chronic Diabetic Nephropathy', severity: 'High', hospital: 'St. Jude Medical Center' },
    ],
    riskFactors: [
      'Elevated HbA1c (9.4% on admission)',
      'Creatinine clearance < 45 ml/min',
      'History of 2 readmissions in past 12 months',
      'Poor medication adherence reported',
    ],
    treatmentHistory: [
      'Metformin 1000mg/day adjusted to Insulin Glargine therapy',
      'Renal functional monitoring regimen',
      'Nutritional dietary counseling',
    ],
    recoveryProgress: {
      score: 65,
      medicationAdherence: 'Fair',
      comorbiditiesCount: 3,
      bpReading: '135/88 mmHg',
    },
    clinicalInsights: {
      riskMitigation: 'Transition to subcutaneous insulin pump and coordinate home health nurse visit within 48h of discharge.',
      careRecommendations: 'Conduct comprehensive medication reconciliation; emphasize diet control and compliance with renal clinics.',
      followUpPlanning: 'In-clinic follow-up scheduled with Endocrinologist on 2026-09-02; phone wellness check on 2026-08-22.',
      dischargeRecommendations: 'Monitor glucose at home 3x daily. Restrict potassium & sodium intake.',
    },
    hba1cResult: '>8',
    diabetesMed: true,
  },
  {
    id: 'HFC-002',
    name: 'Clara Oswald',
    age: 72,
    gender: 'Female',
    admissionDate: '2026-08-15',
    dischargeDate: '2026-08-22',
    diagnosis: 'Congestive Heart Failure (CHF)',
    riskLevel: 'High',
    readmissionProbability: 76,
    treatmentStatus: 'Improving',
    assignedDoctor: 'S.Saumya',
    contact: {
      phone: '+1 (555) 765-4321',
      email: 'clara.o@telecom.net',
      address: '45 Baker St, Apartment 3B, Seattle, WA',
    },
    medicalHistory: [
      { id: 'MH-021', date: '2026-05-18', diagnosis: 'Acute Dyspnea', severity: 'Severe', hospital: 'St. Jude Medical Center' },
      { id: 'MH-022', date: '2026-01-10', diagnosis: 'Mitral Valve Regurgitation', severity: 'Mild', hospital: 'Westside Cardiac Clinic' },
    ],
    riskFactors: [
      'LVEF < 35% on echocardiogram',
      'B-type Natriuretic Peptide (BNP) > 800 pg/mL',
      'Persistent bilateral pedal edema',
      'Age greater than 70 with chronic hypertension',
    ],
    treatmentHistory: [
      'Intravenous Furosemide (Lasix) 40mg twice daily',
      'Lisinopril 10mg once daily started',
      'Fluid restriction protocol (1.5L/day)',
    ],
    recoveryProgress: {
      score: 72,
      medicationAdherence: 'Good',
      comorbiditiesCount: 2,
      bpReading: '128/78 mmHg',
    },
    clinicalInsights: {
      riskMitigation: 'Provide daily telehealth weight monitoring scales. A 2 lb weight increase in 24h must alert cardiology nurse.',
      careRecommendations: 'Strict fluid restriction. Educate patient and family on signs of acute decompensation.',
      followUpPlanning: 'Echocardiogram check-up in 3 weeks; primary care clinical visit on 2026-08-30.',
      dischargeRecommendations: 'Record weight daily before breakfast. Take Spironolactone as directed.',
    },
    hba1cResult: 'Norm',
    diabetesMed: false,
  },
  {
    id: 'HFC-003',
    name: 'James T. Kirk',
    age: 61,
    gender: 'Male',
    admissionDate: '2026-08-18',
    dischargeDate: null,
    diagnosis: 'Chronic Obstructive Pulmonary Disease (COPD) Exacerbation',
    riskLevel: 'Medium',
    readmissionProbability: 54,
    treatmentStatus: 'Improving',
    assignedDoctor: 'Dr. Robert Chen',
    contact: {
      phone: '+1 (555) 901-2345',
      email: 'enterprise.captain@starfleet.org',
      address: '87 Pine Crest Way, Bellevue, WA',
    },
    medicalHistory: [
      { id: 'MH-031', date: '2025-08-20', diagnosis: 'Severe Bronchitis', severity: 'Moderate', hospital: 'Seattle General' },
    ],
    riskFactors: [
      '30 pack-year smoking history',
      'FEV1 < 50% predicted',
      'Exertional dyspnea with baseline oxygen sat 92%',
    ],
    treatmentHistory: [
      'Nebulized Albuterol + Ipratropium every 6 hours',
      'Oral Prednisone 40mg taper course',
      'Supplemental O2 via nasal cannula @ 2L/min',
    ],
    recoveryProgress: {
      score: 78,
      medicationAdherence: 'Good',
      comorbiditiesCount: 1,
      bpReading: '122/74 mmHg',
    },
    clinicalInsights: {
      riskMitigation: 'Enforce outpatient pulmonary rehabilitation enrollment prior to discharge.',
      careRecommendations: 'Inhaler technique verification and tobacco cessation support program.',
      followUpPlanning: 'Spirometry follow-up at 30 days post-discharge.',
      dischargeRecommendations: 'Continue maintenance Budesonide/Formoterol DPI twice daily.',
    },
    hba1cResult: 'None',
    diabetesMed: false,
  },
  {
    id: 'HFC-004',
    name: 'Eleanor Sterling',
    age: 54,
    gender: 'Female',
    admissionDate: '2026-08-10',
    dischargeDate: '2026-08-19',
    diagnosis: 'Post-Operative CABG Recovery & Hypertension',
    riskLevel: 'Low',
    readmissionProbability: 22,
    treatmentStatus: 'Discharged',
    assignedDoctor: 'S.Saumya',
    contact: {
      phone: '+1 (555) 345-6789',
      email: 'eleanor.sterling@outlook.com',
      address: '204 Orchard Blvd, Kirkland, WA',
    },
    medicalHistory: [
      { id: 'MH-041', date: '2026-08-10', diagnosis: 'Coronary Artery Bypass Graft (3-vessel)', severity: 'Major', hospital: 'St. Jude Medical Center' },
    ],
    riskFactors: [
      'Post-sternotomy wound healing phase',
      'Controlled hypertension on Metoprolol',
    ],
    treatmentHistory: [
      'Aspirin 81mg + Clopidogrel 75mg daily',
      'Atorvastatin 80mg bedtime',
      'Cardiac physical therapy phase 1',
    ],
    recoveryProgress: {
      score: 91,
      medicationAdherence: 'Excellent',
      comorbiditiesCount: 1,
      bpReading: '118/72 mmHg',
    },
    clinicalInsights: {
      riskMitigation: 'Low risk of 30-day readmission. Maintain regular surgical wound cleaning.',
      careRecommendations: 'Begin cardiac rehab phase 2 at week 4 post-op.',
      followUpPlanning: 'Cardiology clinic checkup on 2026-09-10.',
      dischargeRecommendations: 'Avoid heavy lifting > 10 lbs for 6 weeks. Take dual antiplatelets without pause.',
    },
    hba1cResult: 'Norm',
    diabetesMed: false,
  },
  {
    id: 'HFC-005',
    name: 'David Chen',
    age: 59,
    gender: 'Male',
    admissionDate: '2026-08-19',
    dischargeDate: null,
    diagnosis: 'Diabetic Ketoacidosis (DKA) & Sepsis',
    riskLevel: 'High',
    readmissionProbability: 88,
    treatmentStatus: 'Critical',
    assignedDoctor: 'S.Saumya',
    contact: {
      phone: '+1 (555) 456-7890',
      email: 'david.chen@techcorp.io',
      address: '502 Innovation Dr, Redmond, WA',
    },
    medicalHistory: [
      { id: 'MH-051', date: '2026-02-11', diagnosis: 'DKA Admission', severity: 'Severe', hospital: 'St. Jude Medical Center' },
    ],
    riskFactors: [
      'Blood glucose on arrival: 480 mg/dL',
      'Anion gap > 18 mEq/L',
      'Urinary tract infection secondary bacteremia',
      'Missed basal insulin doses in prior week',
    ],
    treatmentHistory: [
      'Continuous regular insulin IV infusion @ 0.1 units/kg/hr',
      'Aggressive isotonic saline hydration (3L in 6h)',
      'IV Ceftriaxone 2g daily for sepsis protocol',
    ],
    recoveryProgress: {
      score: 48,
      medicationAdherence: 'Poor',
      comorbiditiesCount: 3,
      bpReading: '105/65 mmHg',
    },
    clinicalInsights: {
      riskMitigation: 'Urgent endocrinology consult. Transition to SQ insulin only after anion gap normalizes (<12).',
      careRecommendations: 'Comprehensive diabetes self-management education (DSME) prior to discharge.',
      followUpPlanning: 'Endocrine outpatient follow-up within 7 days of discharge.',
      dischargeRecommendations: 'Continuous glucose monitor (CGM) prescription and sick-day management protocol review.',
    },
    hba1cResult: '>8',
    diabetesMed: true,
  },
  {
    id: 'HFC-006',
    name: 'Sarah Jenkins',
    age: 45,
    gender: 'Female',
    admissionDate: '2026-08-17',
    dischargeDate: null,
    diagnosis: 'Acute Coronary Syndrome (ACS) - NSTEMI',
    riskLevel: 'Medium',
    readmissionProbability: 49,
    treatmentStatus: 'Improving',
    assignedDoctor: 'Dr. Robert Chen',
    contact: {
      phone: '+1 (555) 567-8901',
      email: 's.jenkins@designlab.org',
      address: '77 Mercer St, Seattle, WA',
    },
    medicalHistory: [
      { id: 'MH-061', date: '2024-09-12', diagnosis: 'Hyperlipidemia', severity: 'Mild', hospital: 'Pacific Clinic' },
    ],
    riskFactors: [
      'Peak Troponin I: 4.2 ng/mL',
      'Family history of premature CAD',
      'Elevated LDL (165 mg/dL)',
    ],
    treatmentHistory: [
      'Drug-eluting stent placed in Left Anterior Descending (LAD)',
      'Ticagrelor 90mg twice daily + Aspirin 81mg',
      'Rosuvastatin 40mg daily',
    ],
    recoveryProgress: {
      score: 82,
      medicationAdherence: 'Good',
      comorbiditiesCount: 1,
      bpReading: '124/76 mmHg',
    },
    clinicalInsights: {
      riskMitigation: 'Monitor for stent thrombosis. Stress importance of uninterrupted DAPT.',
      careRecommendations: 'Lifestyle and dietary consultation with registered clinical dietitian.',
      followUpPlanning: 'Post-PCI clinic evaluation on 2026-09-05.',
      dischargeRecommendations: 'Do not stop antiplatelet medication without consulting cardiologist.',
    },
    hba1cResult: 'Norm',
    diabetesMed: false,
  },
  {
    id: 'HFC-007',
    name: 'Robert Morales',
    age: 77,
    gender: 'Male',
    admissionDate: '2026-08-14',
    dischargeDate: '2026-08-21',
    diagnosis: 'End-Stage Renal Disease (ESRD) & Fluid Overload',
    riskLevel: 'High',
    readmissionProbability: 84,
    treatmentStatus: 'Stable',
    assignedDoctor: 'S.Saumya',
    contact: {
      phone: '+1 (555) 678-9012',
      email: 'r.morales@family.net',
      address: '310 Rainier Ave S, Renton, WA',
    },
    medicalHistory: [
      { id: 'MH-071', date: '2026-04-02', diagnosis: 'Hyperkalemia Emergency', severity: 'Severe', hospital: 'St. Jude Medical Center' },
      { id: 'MH-072', date: '2025-12-14', diagnosis: 'AV Fistula Stenosis', severity: 'Moderate', hospital: 'Vascular Center' },
    ],
    riskFactors: [
      'Hemodialysis dependent (MWF schedule)',
      'Frequent interdialytic weight gains > 4 kg',
      'History of 3 emergency department visits in 6 months',
    ],
    treatmentHistory: [
      'Emergent hemodialysis session with 3.5L ultrafiltration',
      'Sodium Polystyrene Sulfonate for potassium binding',
      'Phosphate binder regimen adjustment',
    ],
    recoveryProgress: {
      score: 60,
      medicationAdherence: 'Fair',
      comorbiditiesCount: 4,
      bpReading: '142/90 mmHg',
    },
    clinicalInsights: {
      riskMitigation: 'Coordinate directly with outpatient dialysis center to ensure no missed treatments.',
      careRecommendations: 'Strict fluid intake cap at 1.0L per 24 hours.',
      followUpPlanning: 'Dialysis schedule verification on 2026-08-23.',
      dischargeRecommendations: 'Adhere strictly to hemodialysis appointments. Check dry weight regularly.',
    },
    hba1cResult: 'None',
    diabetesMed: false,
  },
  {
    id: 'HFC-008',
    name: 'Grace Hopper',
    age: 64,
    gender: 'Female',
    admissionDate: '2026-08-16',
    dischargeDate: null,
    diagnosis: 'Community-Acquired Pneumonia & Type 2 Diabetes',
    riskLevel: 'Medium',
    readmissionProbability: 46,
    treatmentStatus: 'Improving',
    assignedDoctor: 'S.Saumya',
    contact: {
      phone: '+1 (555) 789-0123',
      email: 'grace.hopper@compiler.org',
      address: '1906 Harvard Ave, Seattle, WA',
    },
    medicalHistory: [
      { id: 'MH-081', date: '2025-10-05', diagnosis: 'Diabetic Peripheral Neuropathy', severity: 'Moderate', hospital: 'St. Jude Medical Center' },
    ],
    riskFactors: [
      'CURB-65 score: 2',
      'Chest X-ray shows right middle lobe consolidation',
      'Mild hyperglycemia during acute infection',
    ],
    treatmentHistory: [
      'IV Ampicillin/Sulbactam 1.5g q6h switched to Oral Amoxicillin/Clavulanate',
      'Sliding scale regular insulin for infection-induced hyperglycemia',
      'Incentive spirometry therapy',
    ],
    recoveryProgress: {
      score: 80,
      medicationAdherence: 'Good',
      comorbiditiesCount: 2,
      bpReading: '120/78 mmHg',
    },
    clinicalInsights: {
      riskMitigation: 'Complete full 7-day antibiotic course even if feeling fully recovered.',
      careRecommendations: 'Pneumococcal & seasonal influenza vaccination update upon full recovery.',
      followUpPlanning: 'Repeat chest radiography in 6 weeks.',
      dischargeRecommendations: 'Practice deep breathing exercises 10 times every waking hour.',
    },
    hba1cResult: '>7',
    diabetesMed: true,
  },
  {
    id: 'HFC-009',
    name: 'Samuel Clemens',
    age: 70,
    gender: 'Male',
    admissionDate: '2026-08-11',
    dischargeDate: '2026-08-18',
    diagnosis: 'Atrial Fibrillation with Rapid Ventricular Response (RVR)',
    riskLevel: 'Low',
    readmissionProbability: 28,
    treatmentStatus: 'Discharged',
    assignedDoctor: 'Dr. Robert Chen',
    contact: {
      phone: '+1 (555) 890-1234',
      email: 'mark.twain@mississippi.org',
      address: '400 Riverboat Way, Tacoma, WA',
    },
    medicalHistory: [
      { id: 'MH-091', date: '2026-01-22', diagnosis: 'Paroxysmal A-Fib', severity: 'Moderate', hospital: 'Tacoma General' },
    ],
    riskFactors: [
      'CHA2DS2-VASc score: 3',
      'History of intermittent palpitations',
    ],
    treatmentHistory: [
      'IV Diltiazem drip successfully rate-controlled',
      'Transitioned to oral Diltiazem CD 240mg daily',
      'Initiated Apixaban (Eliquis) 5mg twice daily',
    ],
    recoveryProgress: {
      score: 88,
      medicationAdherence: 'Good',
      comorbiditiesCount: 1,
      bpReading: '116/74 mmHg',
    },
    clinicalInsights: {
      riskMitigation: 'Low 30-day readmission risk after achieving rate control and therapeutic anticoagulation.',
      careRecommendations: 'Avoid excessive caffeine and alcohol which may trigger tachyarrhythmias.',
      followUpPlanning: 'Cardiology rhythm clinic in 4 weeks.',
      dischargeRecommendations: 'Take Apixaban consistently with or without food. Report any unusual bruising.',
    },
    hba1cResult: 'None',
    diabetesMed: false,
  },
  {
    id: 'HFC-010',
    name: 'Maya Lin',
    age: 51,
    gender: 'Female',
    admissionDate: '2026-08-20',
    dischargeDate: null,
    diagnosis: 'Severe Acute Pancreatitis',
    riskLevel: 'Medium',
    readmissionProbability: 52,
    treatmentStatus: 'Under Observation',
    assignedDoctor: 'S.Saumya',
    contact: {
      phone: '+1 (555) 901-2345',
      email: 'maya.lin@architecture.org',
      address: '1500 Stone Way N, Seattle, WA',
    },
    medicalHistory: [
      { id: 'MH-101', date: '2025-06-18', diagnosis: 'Biliary Colic', severity: 'Moderate', hospital: 'St. Jude Medical Center' },
    ],
    riskFactors: [
      'Serum lipase > 3x upper limit of normal (1450 U/L)',
      'Abdominal ultrasound demonstrates cholelithiasis',
    ],
    treatmentHistory: [
      'NPO status with aggressive IV Lactated Ringer fluid resuscitation',
      'IV Hydromorphone for pain control as needed',
      'Elective cholecystectomy planned upon resolution of acute inflammation',
    ],
    recoveryProgress: {
      score: 68,
      medicationAdherence: 'Fair',
      comorbiditiesCount: 1,
      bpReading: '126/80 mmHg',
    },
    clinicalInsights: {
      riskMitigation: 'Advance diet slowly from clear liquids to low-fat solids as pain subsides.',
      careRecommendations: 'Schedule interval laparoscopic cholecystectomy during current admission or within 2-4 weeks.',
      followUpPlanning: 'Surgical consult follow-up prior to discharge.',
      dischargeRecommendations: 'Strict low-fat diet. Zero alcohol consumption.',
    },
    hba1cResult: 'Norm',
    diabetesMed: false,
  },
];

const seedModels = [
  {
    id: 'M-01',
    name: 'XGBoost Readmission Classifier',
    type: 'Classification',
    version: 'v2.4',
    accuracy: 92.4,
    f1Score: 89.6,
    aucRoc: 0.94,
    status: 'Active (Deployed)',
    lastTrained: '2026-08-20',
  },
  {
    id: 'M-02',
    name: 'Random Forest Risk Forecaster',
    type: 'Ensemble',
    version: 'v1.8',
    accuracy: 88.7,
    f1Score: 86.2,
    aucRoc: 0.90,
    status: 'Standby (Ready)',
    lastTrained: '2026-08-10',
  },
  {
    id: 'M-03',
    name: 'LightGBM Multi-Encounter Predictor',
    type: 'Gradient Boosting',
    version: 'v3.1',
    accuracy: 94.1,
    f1Score: 91.8,
    aucRoc: 0.96,
    status: 'Standby (Ready)',
    lastTrained: '2026-08-15',
  },
  {
    id: 'M-04',
    name: 'Deep Neural Network SHAP Explainer',
    type: 'Deep Learning',
    version: 'v2.0',
    accuracy: 90.5,
    f1Score: 88.0,
    aucRoc: 0.92,
    status: 'Standby (Ready)',
    lastTrained: '2026-08-01',
  },
];

const seedDatasets = [
  {
    id: 'D-2026-A',
    name: 'UCI Diabetes 130-US Hospitals (101,766 Encounters)',
    version: 'v1.0',
    recordsCount: 101766,
    format: 'CSV',
    status: 'Active',
    lastUpdated: '2026-08-20',
  },
  {
    id: 'D-2026-B',
    name: 'Cardiovascular 30-Day Multi-Center Cohort',
    version: 'v2.1',
    recordsCount: 45200,
    format: 'JSON / Parquet',
    status: 'Active',
    lastUpdated: '2026-08-12',
  },
  {
    id: 'D-2026-C',
    name: 'CMS Medicare Readmission Benchmarks',
    version: 'v1.5',
    recordsCount: 28400,
    format: 'CSV',
    status: 'Active',
    lastUpdated: '2026-07-28',
  },
];

const seedAuditLogs = [
  {
    id: 'AL-5801',
    user: 'Penchala Prasad',
    role: 'system-admin',
    action: 'Deployed XGBoost Readmission Classifier v2.4 to production endpoint',
    module: 'AI Model Management',
    timestamp: '2026-08-26 14:15:22',
    status: 'Success',
    ipAddress: '192.168.1.10',
  },
  {
    id: 'AL-5802',
    user: 'S.Saumya',
    role: 'doctor',
    action: 'Updated discharge care recommendations and insulin regimen for Marcus Vance (HFC-001)',
    module: 'Clinical Insights',
    timestamp: '2026-08-26 15:30:10',
    status: 'Success',
    ipAddress: '192.168.1.45',
  },
  {
    id: 'AL-5803',
    user: 'Rambilas Sah',
    role: 'hospital-admin',
    action: 'Generated monthly readmission audit analytics report for August 2026',
    module: 'Hospital Analytics',
    timestamp: '2026-08-26 16:45:00',
    status: 'Success',
    ipAddress: '192.168.1.22',
  },
  {
    id: 'AL-5804',
    user: 'K.Deepak Raja',
    role: 'researcher',
    action: 'Extracted de-identified population health dataset cohort (10 patients) for ICD-9 correlation study',
    module: 'Research Intelligence',
    timestamp: '2026-08-26 17:10:44',
    status: 'Success',
    ipAddress: '192.168.1.60',
  },
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/healthforecast';
    console.log(`[Seeder] Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('[Seeder] Connected to MongoDB.');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Encounter.deleteMany({}),
      AuditLog.deleteMany({}),
      AiModel.deleteMany({}),
      Dataset.deleteMany({}),
    ]);
    console.log('[Seeder] Cleared existing collections.');

    // Seed Users (password hashing handled via Mongoose pre-save)
    for (const u of seedUsers) {
      await User.create(u);
    }
    console.log(`[Seeder] Seeded ${seedUsers.length} Users (Doctor, Hospital Admin, Researcher, System Admin).`);

    // Seed Patients
    await Patient.insertMany(seedPatients);
    console.log(`[Seeder] Seeded ${seedPatients.length} Clinical Patient Records with risk scores.`);

    // Seed AI Models
    await AiModel.insertMany(seedModels);
    console.log(`[Seeder] Seeded ${seedModels.length} AI Models.`);

    // Seed Datasets
    await Dataset.insertMany(seedDatasets);
    console.log(`[Seeder] Seeded ${seedDatasets.length} Research Datasets.`);

    // Seed Audit Logs
    await AuditLog.insertMany(seedAuditLogs);
    console.log(`[Seeder] Seeded ${seedAuditLogs.length} Audit Trail Logs.`);

    console.log('[Seeder] Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`[Seeder] Error during seeding: ${error.message}`);
    console.log('[Seeder] Notice: If local MongoDB is not running, ensure you start MongoDB service or configure MONGO_URI in .env.');
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedUsers,
  seedPatients,
  seedModels,
  seedDatasets,
  seedAuditLogs,
};
