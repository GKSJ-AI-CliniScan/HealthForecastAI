// HealthForecast AI - Rich Mock Data

export const mockUsers = [
  {
    id: "U-101",
    email: "doctor@healthforecast.ai",
    password: "password123",
    name: "S.Saumya",
    role: "doctor",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150",
    specialty: "Cardiology & Endocrinology",
    assignedPatientsCount: 8
  },
  {
    id: "U-102",
    email: "admin@healthforecast.ai",
    password: "password123",
    name: "Rambilas Sah",
    role: "hospital-admin",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150",
    department: "Hospital Administration",
    hospitalBranch: "St. Jude Medical Center"
  },
  {
    id: "U-103",
    email: "researcher@healthforecast.ai",
    password: "password123",
    name: "K.Deepak Raja",
    role: "researcher",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150",
    institution: "Health Analytics Institute & Research Labs"
  },
  {
    id: "U-104",
    email: "sysadmin@healthforecast.ai",
    password: "prasad1234",
    name: "Devon Miller",
    role: "system-admin",
    avatar: "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=150",
    clearance: "Level 5 (Super Admin)"
  }
];

export const mockPatients = [
  {
    id: "HFC-001",
    name: "Marcus Vance",
    age: 68,
    gender: "Male",
    admissionDate: "2026-08-12",
    dischargeDate: "2026-08-20",
    diagnosis: "Type 2 Diabetes & Chronic Renal Failure",
    riskLevel: "High",
    readmissionProbability: 82,
    treatmentStatus: "Stable",
    assignedDoctor: "S.Saumya",
    contact: {
      phone: "+1 (555) 234-5678",
      email: "marcus.vance@email.com",
      address: "1042 Maple Dr, Seattle, WA"
    },
    medicalHistory: [
      { id: "MH-011", date: "2026-03-14", diagnosis: "Hypoglycemic Episode", severity: "Moderate", hospital: "St. Jude Medical Center" },
      { id: "MH-012", date: "2025-11-02", diagnosis: "Chronic Diabetic Nephropathy", severity: "High", hospital: "St. Jude Medical Center" }
    ],
    riskFactors: [
      "Elevated HbA1c (9.4% on admission)",
      "Creatinine clearance < 45 ml/min",
      "History of 2 readmissions in past 12 months",
      "Poor medication adherence reported"
    ],
    treatmentHistory: [
      "Metformin 1000mg/day adjusted to Insulin Glargine therapy",
      "Renal functional monitoring regimen",
      "Nutritional dietary counseling"
    ],
    recoveryProgress: {
      score: 65,
      medicationAdherence: "Fair",
      comorbiditiesCount: 3,
      bpReading: "135/88 mmHg"
    },
    clinicalInsights: {
      riskMitigation: "Transition to subcutaneous insulin pump and coordinate home health nurse visit within 48h of discharge.",
      careRecommendations: "Conduct comprehensive medication reconciliation; emphasize diet control and compliance with renal clinics.",
      followUpPlanning: "In-clinic follow-up scheduled with Endocrinologist on 2026-09-02; phone wellness check on 2026-08-22.",
      dischargeRecommendations: "Monitor glucose at home 3x daily. Restrict potassium & sodium intake."
    }
  },
  {
    id: "HFC-002",
    name: "Clara Oswald",
    age: 72,
    gender: "Female",
    admissionDate: "2026-08-15",
    dischargeDate: "2026-08-22",
    diagnosis: "Congestive Heart Failure (CHF)",
    riskLevel: "High",
    readmissionProbability: 76,
    treatmentStatus: "Improving",
    assignedDoctor: "S.Saumya",
    contact: {
      phone: "+1 (555) 765-4321",
      email: "clara.o@telecom.net",
      address: "45 Baker St, Apartment 3B, Seattle, WA"
    },
    medicalHistory: [
      { id: "MH-021", date: "2026-05-18", diagnosis: "Acute Dyspnea", severity: "Severe", hospital: "St. Jude Medical Center" },
      { id: "MH-022", date: "2026-01-10", diagnosis: "Mitral Valve Regurgitation", severity: "Mild", hospital: "Westside Cardiac Clinic" }
    ],
    riskFactors: [
      "LVEF < 35% on echocardiogram",
      "B-type Natriuretic Peptide (BNP) > 800 pg/mL",
      "Persistent bilateral pedal edema",
      "Age greater than 70 with chronic hypertension"
    ],
    treatmentHistory: [
      "Intravenous Furosemide (Lasix) 40mg twice daily",
      "Lisinopril 10mg once daily started",
      "Fluid restriction protocol (1.5L/day)"
    ],
    recoveryProgress: {
      score: 72,
      medicationAdherence: "Good",
      comorbiditiesCount: 2,
      bpReading: "128/78 mmHg"
    },
    clinicalInsights: {
      riskMitigation: "Provide daily telehealth weight monitoring scales. A 2 lb weight increase in 24h must alert cardiology nurse.",
      careRecommendations: "Strict fluid restriction. Educate patient and family on signs of acute decompensation.",
      followUpPlanning: "Echocardiogram check-up in 3 weeks; primary care clinical visit on 2026-08-30.",
      dischargeRecommendations: "Record weight daily before breakfast. Take Spironolactone as directed."
    }
  },
  {
    id: "HFC-003",
    name: "James T. Kirk",
    age: 61,
    gender: "Male",
    admissionDate: "2026-08-18",
    dischargeDate: null,
    diagnosis: "Chronic Obstructive Pulmonary Disease (COPD) Exacerbation",
    riskLevel: "Medium",
    readmissionProbability: 54,
    treatmentStatus: "Improving",
    assignedDoctor: "Dr. Robert Chen",
    contact: {
      phone: "+1 (555) 901-2345",
      email: "enterprise.captain@starfleet.org",
      address: "87 Pine Crest Way, Bellevue, WA"
    },
    medicalHistory: [
      { id: "MH-031", date: "2025-09-12", diagnosis: "Bronchitis", severity: "Moderate", hospital: "St. Jude Medical Center" }
    ],
    riskFactors: [
      "Active history of cigarette smoking (40 pack-years)",
      "FEV1/FVC ratio < 50%",
      "Eosinophilia on lab testing"
    ],
    treatmentHistory: [
      "Nebulized Albuterol + Ipratropium every 4 hours",
      "Oral Prednisone 40mg tapered over 5 days",
      "Supplemental oxygen at 2L/min via nasal cannula"
    ],
    recoveryProgress: {
      score: 80,
      medicationAdherence: "Excellent",
      comorbiditiesCount: 1,
      bpReading: "122/74 mmHg"
    },
    clinicalInsights: {
      riskMitigation: "Prescribe pulmo-rehabilitation package. Link patient with tobacco cessation counselor.",
      careRecommendations: "Proper instruction on MDI (Metered Dose Inhaler) technique. Spacer device supplied.",
      followUpPlanning: "Pulmonologist consultation in 10 days; spirometry testing scheduled in 4 weeks.",
      dischargeRecommendations: "Continue inhalers consistently. Contact clinic if sputum volume or color changes."
    }
  },
  {
    id: "HFC-004",
    name: "Diana Prince",
    age: 45,
    gender: "Female",
    admissionDate: "2026-08-19",
    dischargeDate: "2026-08-25",
    diagnosis: "Severe Community-Acquired Pneumonia",
    riskLevel: "Low",
    readmissionProbability: 23,
    treatmentStatus: "Recovered",
    assignedDoctor: "S.Saumya",
    contact: {
      phone: "+1 (555) 300-8888",
      email: "diana.prince@temyscira.org",
      address: "1200 Gateway Blvd, Seattle, WA"
    },
    medicalHistory: [],
    riskFactors: [
      "Transient pleural effusion",
      "Slight tachycardia on admission"
    ],
    treatmentHistory: [
      "IV Ceftriaxone 2g daily + Azithromycin 500mg daily",
      "Deep breathing and incentive spirometry exercises",
      "Aggressive hydration"
    ],
    recoveryProgress: {
      score: 95,
      medicationAdherence: "Excellent",
      comorbiditiesCount: 0,
      bpReading: "116/70 mmHg"
    },
    clinicalInsights: {
      riskMitigation: "Minimal risk of readmission due to lack of major comorbidities and excellent response to antibiotics.",
      careRecommendations: "Complete full oral antibiotic course (Levofloxacin 500mg daily for 5 additional days). Hydrate well.",
      followUpPlanning: "Routine primary care physician visit in 2 weeks to ensure complete clearing of radiography.",
      dischargeRecommendations: "Avoid strenuous activity for 7 days. Complete oral antibiotic dose without skipping."
    }
  },
  {
    id: "HFC-005",
    name: "Arthur Dent",
    age: 42,
    gender: "Male",
    admissionDate: "2026-08-05",
    dischargeDate: "2026-08-08",
    diagnosis: "Acute Gastroenteritis & Dehydration",
    riskLevel: "Low",
    readmissionProbability: 12,
    treatmentStatus: "Recovered",
    assignedDoctor: "Dr. Robert Chen",
    contact: {
      phone: "+1 (555) 420-4242",
      email: "arthur.dent@hitchhiker.co.uk",
      address: "42 Towel Lane, Cottington, WA"
    },
    medicalHistory: [],
    riskFactors: [],
    treatmentHistory: [
      "IV Fluid resuscitation (Normal Saline 2L)",
      "Antiemetic therapy (Ondansetron 4mg)",
      "Probiotic supplementation"
    ],
    recoveryProgress: {
      score: 98,
      medicationAdherence: "Excellent",
      comorbiditiesCount: 0,
      bpReading: "120/80 mmHg"
    },
    clinicalInsights: {
      riskMitigation: "Extremely low risk readmission. Patient is hemodynamically stable, tolerating oral intake.",
      careRecommendations: "Gradual return to solid foods. Maintain adequate hydration with electrolyte-rich solutions.",
      followUpPlanning: "PRN (As needed) primary care appointment.",
      dischargeRecommendations: "Drink dry/clear liquids. Avoid heavy dairy or greasy food for a few days."
    }
  },
  {
    id: "HFC-006",
    name: "Eleanor Shellstrop",
    age: 38,
    gender: "Female",
    admissionDate: "2026-08-11",
    dischargeDate: "2026-08-14",
    diagnosis: "Acute Appendicitis (Post-Appendectomy)",
    riskLevel: "Low",
    readmissionProbability: 18,
    treatmentStatus: "Recovered",
    assignedDoctor: "S.Saumya",
    contact: {
      phone: "+1 (555) 888-9999",
      email: "eleanor.s@goodplace.org",
      address: "742 Arizona Ave, Phoenix, AZ"
    },
    medicalHistory: [],
    riskFactors: [
      "Mild post-surgical incisional discomfort"
    ],
    treatmentHistory: [
      "Laparoscopic appendectomy successfully performed on 2026-08-11",
      "Post-operative pain management",
      "Wound dressing instructions"
    ],
    recoveryProgress: {
      score: 92,
      medicationAdherence: "Good",
      comorbiditiesCount: 0,
      bpReading: "118/76 mmHg"
    },
    clinicalInsights: {
      riskMitigation: "Supervise surgical recovery site for signs of infection (erythema, warmth, purulent discharge).",
      careRecommendations: "Clean incision site gently. Restrict lifting objects over 10 lbs for 2 weeks.",
      followUpPlanning: "Surgical outpatient clinic in 10 days for stitch evaluation.",
      dischargeRecommendations: "Keep wound dry. Avoid bathing or swimming until stitches are removed."
    }
  },
  {
    id: "HFC-007",
    name: "Walter White",
    age: 52,
    gender: "Male",
    admissionDate: "2026-08-01",
    dischargeDate: "2026-08-15",
    diagnosis: "Lung Adenocarcinoma (Post-Chemotherapy Pancytopenia)",
    riskLevel: "High",
    readmissionProbability: 88,
    treatmentStatus: "Stable",
    assignedDoctor: "Dr. Richard Webber",
    contact: {
      phone: "+1 (505) 148-3369",
      email: "heisenberg@graymatter.com",
      address: "308 Negra Arroyo Lane, Albuquerque, NM"
    },
    medicalHistory: [
      { id: "MH-071", date: "2026-06-10", diagnosis: "Neutropenic Fever", severity: "Severe", hospital: "Albuquerque General" },
      { id: "MH-072", date: "2026-04-03", diagnosis: "Bronchoscopy & Biopsy", severity: "Moderate", hospital: "Cancer Center West" }
    ],
    riskFactors: [
      "Severe chemotherapy-induced myelosuppression",
      "Absolute Neutrophil Count (ANC) < 1000 cells/mcL",
      "Advanced malignancy, active stage IIIa",
      "History of secondary pulmonary infections"
    ],
    treatmentHistory: [
      "Granulocyte colony-stimulating factor (G-CSF) injections",
      "Prophylactic broad-spectrum antibiotics (Levofloxacin)",
      "Platelet transfusion (1 unit)"
    ],
    recoveryProgress: {
      score: 55,
      medicationAdherence: "Fair",
      comorbiditiesCount: 2,
      bpReading: "110/68 mmHg"
    },
    clinicalInsights: {
      riskMitigation: "Highly immunocompromised. Implement strict neutropenic precautions. Home nurse to check blood counts weekly.",
      careRecommendations: "Avoid crowded places and fresh uncut fruits/vegetables. Report temp > 100.4F immediately.",
      followUpPlanning: "Oncology consult and complete blood count (CBC) scheduled on 2026-08-18.",
      dischargeRecommendations: "Check temperature twice daily. Keep mask on when near others."
    }
  },
  {
    id: "HFC-008",
    name: "Bruce Banner",
    age: 49,
    gender: "Male",
    admissionDate: "2026-08-20",
    dischargeDate: null,
    diagnosis: "Severe Chronic Hypertension & Coronary Occlusion",
    riskLevel: "High",
    readmissionProbability: 79,
    treatmentStatus: "Critical",
    assignedDoctor: "Dr. Robert Chen",
    contact: {
      phone: "+1 (703) 444-5555",
      email: "hulk.smashes@avengers.org",
      address: "Secret Laboratory Complex, Culver City, CA"
    },
    medicalHistory: [
      { id: "MH-081", date: "2026-02-14", diagnosis: "Hypertensive Emergency", severity: "Severe", hospital: "S.H.I.E.L.D Medical Hub" }
    ],
    riskFactors: [
      "Systolic blood pressure peak of 210 mmHg on admission",
      "Severe stress levels and anger management triggers",
      "Left ventricular hypertrophy"
    ],
    treatmentHistory: [
      "Intravenous Sodium Nitroprusside infusion for rapid pressure titration",
      "Beta-blocker therapy initialized (Carvedilol 12.5mg BID)",
      "Daily psychological counselor stress evaluation"
    ],
    recoveryProgress: {
      score: 48,
      medicationAdherence: "Poor",
      comorbiditiesCount: 3,
      bpReading: "168/102 mmHg"
    },
    clinicalInsights: {
      riskMitigation: "Deploy continuous ambulatory blood pressure monitor. Link with cardiac rehab and biofeedback therapy.",
      careRecommendations: "Aggressive reduction of sympathetic triggers. Sodium-restricted DASH diet (<1500mg/day).",
      followUpPlanning: "Weekly cardiology appointment; emergency clinic hotline provided.",
      dischargeRecommendations: "Monitor BP at Home. Mandatory twice-daily dosing. Follow up with counselor."
    }
  },
  {
    id: "HFC-009",
    name: "Tony Stark",
    age: 51,
    gender: "Male",
    admissionDate: "2026-08-14",
    dischargeDate: "2026-08-17",
    diagnosis: "Cardiac Arrhythmia & Metallic Complications (Pacemaker Adjustments)",
    riskLevel: "Medium",
    readmissionProbability: 45,
    treatmentStatus: "Stable",
    assignedDoctor: "S.Saumya",
    contact: {
      phone: "+1 (800) Stark-Ind",
      email: "tony@stark.com",
      address: "10880 Wilshire Blvd, Los Angeles, CA"
    },
    medicalHistory: [
      { id: "MH-091", date: "2024-04-18", diagnosis: "Arc Reactor Implant Surgery", severity: "Life-Threatening", hospital: "Stark Labs Medical Wing" }
    ],
    riskFactors: [
      "Cardiac tissue scarring from foreign bodies",
      "Occasional ventricular tachycardia",
      "High work workload stress and lack of sleep"
    ],
    treatmentHistory: [
      "Pacemaker calibration and firmware update",
      "Electrophysiology study validation",
      "Amiodarone oral dose adjustment"
    ],
    recoveryProgress: {
      score: 82,
      medicationAdherence: "Good",
      comorbiditiesCount: 2,
      bpReading: "124/76 mmHg"
    },
    clinicalInsights: {
      riskMitigation: "Establish automatic telemetry sync from pacemaker to hospital database daily.",
      careRecommendations: "Limit physical stress on chest wall. Ensure compliance with anti-arrhythmic medication. Rest 8h nightly.",
      followUpPlanning: "Device interrogation check in 30 days. Contact cardiology nurse for any palpitations.",
      dischargeRecommendations: "Avoid strong electromagnetic fields. Keep pacemaker clinic numbers on speed dial."
    }
  },
  {
    id: "HFC-010",
    name: "Selina Kyle",
    age: 33,
    gender: "Female",
    admissionDate: "2026-08-10",
    dischargeDate: "2026-08-12",
    diagnosis: "Orthopedic Ankle Fracture Fixation (Post-Op Care)",
    riskLevel: "Low",
    readmissionProbability: 25,
    treatmentStatus: "Recovered",
    assignedDoctor: "Dr. Richard Webber",
    contact: {
      phone: "+1 (555) Cat-Burg",
      email: "selina.kyle@gotham.org",
      address: "East End Rooftops Apt 9, Gotham City, NY"
    },
    medicalHistory: [],
    riskFactors: [
      "High risk of early weight-bearing compliance issues",
      "Tobacco user"
    ],
    treatmentHistory: [
      "Open reduction internal fixation (ORIF) of left lateral malleolus",
      "Post-operative immobilization splint",
      "Physical therapy training for crutch safety"
    ],
    recoveryProgress: {
      score: 90,
      medicationAdherence: "Excellent",
      comorbiditiesCount: 1,
      bpReading: "112/68 mmHg"
    },
    clinicalInsights: {
      riskMitigation: "Ensure patient maintains non-weight bearing status for 4 more weeks. Provide knee-scooter options.",
      careRecommendations: "Elevate leg above heart to minimize edema. Perform periodic deep vein thrombosis (DVT) exercises.",
      followUpPlanning: "Orthopedic x-ray check-up in 2 weeks (2026-08-26); suture removal scheduled.",
      dischargeRecommendations: "Strictly no weight on left foot. Keep cast completely dry. Take anticoagulant injections as ordered."
    }
  }
];

export const mockHospitalAnalytics = {
  kpis: {
    totalPatients: 1420,
    highRiskPatients: 184,
    averageReadmissionRate: 14.2, // in %
    recoveryRate: 88.5,             // in %
    treatmentSuccessRate: 84.1,     // in %
    avgBedOccupancy: 81.3,         // in %
    hospitalRating: 4.8
  },
  monthlyTrends: [
    { month: "Jan", readmissionRate: 15.6, totalAdmissions: 280, highRiskCount: 45 },
    { month: "Feb", readmissionRate: 14.8, totalAdmissions: 260, highRiskCount: 38 },
    { month: "Mar", readmissionRate: 15.2, totalAdmissions: 310, highRiskCount: 52 },
    { month: "Apr", readmissionRate: 14.1, totalAdmissions: 290, highRiskCount: 40 },
    { month: "May", readmissionRate: 13.9, totalAdmissions: 320, highRiskCount: 48 },
    { month: "Jun", readmissionRate: 13.5, totalAdmissions: 340, highRiskCount: 44 },
    { month: "Jul", readmissionRate: 14.3, totalAdmissions: 300, highRiskCount: 51 },
    { month: "Aug", readmissionRate: 14.2, totalAdmissions: 315, highRiskCount: 49 }
  ],
  departmentPerformance: [
    { department: "Cardiology", readmissionRate: 16.8, patientCount: 420, recoveryRate: 85.2 },
    { department: "Endocrinology", readmissionRate: 15.2, patientCount: 350, recoveryRate: 87.5 },
    { department: "Pulmonology", readmissionRate: 13.4, patientCount: 280, recoveryRate: 89.1 },
    { department: "General Medicine", readmissionRate: 11.2, patientCount: 370, recoveryRate: 91.8 }
  ],
  riskDistribution: [
    { category: "High Risk", count: 184, percentage: 13 },
    { category: "Medium Risk", count: 452, percentage: 32 },
    { category: "Low Risk", count: 784, percentage: 55 }
  ],
  treatmentSuccessByMedication: [
    { treatment: "Insulin Glargine (Diabetes)", successRate: 85, sideEffectsRate: 4 },
    { treatment: "Furosemide IV (Heart Failure)", successRate: 82, sideEffectsRate: 8 },
    { treatment: "Nebulizer Steroids (COPD)", successRate: 88, successCount: 246, sideEffectsRate: 5 },
    { treatment: "Ceftriaxone IV (Pneumonia)", successRate: 94, successCount: 328, sideEffectsRate: 2 },
    { treatment: "Laparoscopic Excision (Appendicitis)", successRate: 97, sideEffectsRate: 1 }
  ]
};

export const mockResearchAnalytics = {
  anonymizedAggregatedData: [
    { ageGroup: "18-35", count: 154, readmissionCount: 12, avgReadmissionProb: 7.8 },
    { ageGroup: "36-50", count: 342, readmissionCount: 38, avgReadmissionProb: 11.1 },
    { ageGroup: "51-65", count: 520, readmissionCount: 84, avgReadmissionProb: 16.2 },
    { ageGroup: "66-80", count: 480, readmissionCount: 96, avgReadmissionProb: 20.0 },
    { ageGroup: "80+", count: 210, readmissionCount: 52, avgReadmissionProb: 24.8 }
  ],
  populationRiskByDiagnosis: [
    { diagnosis: "Diabetes Mellitus Type 2", highRiskPct: 35, avgStayDays: 6.2 },
    { diagnosis: "Congestive Heart Failure", highRiskPct: 58, avgStayDays: 8.5 },
    { diagnosis: "COPD Exacerbation", highRiskPct: 42, avgStayDays: 5.8 },
    { diagnosis: "Pneumonia", highRiskPct: 22, avgStayDays: 7.0 },
    { diagnosis: "Hypertension / Cardiovascular", highRiskPct: 28, avgStayDays: 4.5 }
  ],
  datasets: [
    { id: "D-2026-A", version: "v3.1", name: "Diabetes 130-US Hospitals (Patient Profile Analysis)", recordsCount: 101766, format: "CSV", status: "Active", lastUpdated: "2026-07-28" },
    { id: "D-2026-B", version: "v2.0", name: "Cardiorespiratory Historical Cohort Study", recordsCount: 45000, format: "Parquet", status: "Processing", lastUpdated: "2026-08-05" },
    { id: "D-2026-C", version: "v1.4", name: "St. Jude ICU Readmissions Dataset", recordsCount: 12400, format: "JSON/MongoDump", status: "Active", lastUpdated: "2026-08-11" }
  ]
};

export const mockAuditLogs = [
  { id: "AL-5801", user: "Rambilas Sah (Admin)", action: "Exported Readmission Report", module: "Healthcare Analytics", timestamp: "2026-08-26 13:12:04", status: "Success" },
  { id: "AL-5802", user: "S.Saumya", action: "Discharged Patient HFC-001 (Marcus)", module: "Patient Management", timestamp: "2026-08-26 12:45:10", status: "Success" },
  { id: "AL-5803", user: "Devon Miller (SysAdmin)", action: "Trained Random Forest V2.4", module: "AI Model Management", timestamp: "2026-08-26 10:20:00", status: "Success" },
  { id: "AL-5804", user: "K.Deepak Raja", action: "Downloaded Anonymized Population Dataset", module: "Research Dashboard", timestamp: "2026-08-26 09:15:33", status: "Success" },
  { id: "AL-5805", user: "Devon Miller (SysAdmin)", action: "Deactivated Mock User Accounts", module: "User Management", timestamp: "2026-08-25 18:04:12", status: "Success" },
  { id: "AL-5806", user: "Dr. Robert Chen", action: "Prescribed Beta-Blockers (Arthur Dent)", module: "Clinical Insights", timestamp: "2026-08-25 14:35:48", status: "Success" },
  { id: "AL-5807", user: "Rambilas Sah (Admin)", action: "Generated Billing Performance Report", module: "Hospital Reports", timestamp: "2026-08-25 11:10:02", status: "Success" }
];

export const mockAiModels = [
  {
    id: "M-101",
    name: "XGBoost Readmission Predictor",
    version: "v2.5.1",
    status: "Active (Deployed)",
    accuracy: 89.4,
    precision: 88.2,
    recall: 86.8,
    f1Score: 87.5,
    rocAuc: 0.932,
    lastTrained: "2026-08-24",
    datasetUsed: "Diabetes 130-US Hospitals (v3.1)",
    featuresImportances: [
      { name: "Prior Admissions", weight: 0.32 },
      { name: "HbA1c Levels", weight: 0.22 },
      { name: "Length of Stay", weight: 0.18 },
      { name: "Comorbidities Count", weight: 0.15 },
      { name: "Age Segment", weight: 0.13 }
    ]
  },
  {
    id: "M-102",
    name: "Random Forest Patient Classifier",
    version: "v2.4.0",
    status: "Standby (Ready)",
    accuracy: 87.2,
    precision: 85.9,
    recall: 84.1,
    f1Score: 85.0,
    rocAuc: 0.908,
    lastTrained: "2026-08-26",
    datasetUsed: "St. Jude ICU Readmissions Dataset (v1.4)",
    featuresImportances: [
      { name: "ICU Stay Days", weight: 0.40 },
      { name: "Oxygen Saturation Min", weight: 0.25 },
      { name: "Creatinine levels", weight: 0.20 },
      { name: "Other Factors", weight: 0.15 }
    ]
  },
  {
    id: "M-103",
    name: "LSTM Clinical Recommendation Engine",
    version: "v1.8.0-beta",
    status: "Testing",
    accuracy: 83.5,
    precision: 81.2,
    recall: 79.8,
    f1Score: 80.5,
    rocAuc: 0.865,
    lastTrained: "2026-08-18",
    datasetUsed: "Cardiorespiratory Historical Cohort Study",
    featuresImportances: [
      { name: "Medication sequences", weight: 0.55 },
      { name: "Time intervals between visits", weight: 0.30 },
      { name: "Demographics", weight: 0.15 }
    ]
  }
];
