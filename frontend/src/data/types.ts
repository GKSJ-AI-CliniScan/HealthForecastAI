/**
 * types.ts — the shapes the SCREENS use, independent of the backend's JSON.
 *
 * WHY A SEPARATE LAYER: the backend and the old frontend disagreed on shapes
 * (e.g. backend sends readmission_rate = 0.112, old UI expected 11.2; backend's
 * /analytics/readmissions is per discharge type, old UI expected months).
 * Screens now only know these types; data/live.ts converts backend JSON into
 * them in ONE place. If the backend changes, only live.ts changes.
 *
 * RULE: every percentage in these types is 0–100 (already multiplied).
 * FLOWS NEXT: live.ts and demo.ts both implement `DataSource`; pages call it.
 */
export type Role = 'doctor' | 'hospital_admin' | 'researcher' | 'system_admin';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface HomeStats {
  patients: number;
  visits: number;
  returned30: number;
  returnRatePct: number;
  /** null when the backend does not compute it (we show "—", never a guess). */
  avgStayDays: number | null;
  highRisk: number;
}

export interface PatientRow {
  id: number;
  mrn: string;
  name: string;
  ageGroup: string | null;
  gender: string | null;
  illness: string | null;
  risk: RiskLevel;
  riskPct: number;
}

export interface Visit {
  id: number;
  admittedOn: string | null;
  daysStayed: number | null;
  type: string | null;
  leftHow: string | null;
  medicines: number | null;
  /** true = came back within 30 days, false = did not, null = unknown */
  returned30: boolean | null;
}

export interface PatientDetail extends PatientRow {
  visits: Visit[];
}

export interface RiskResult {
  patientId: number;
  riskPct: number;
  risk: RiskLevel;
  modelName: string;
  checkedAt: string | null;
}

export interface CareAdvice {
  patientId: number;
  actions: string[];
  followUpDays: number | null;
  readyToGoHome: boolean | null;
  readinessPct: number | null;
  afterHomeSteps: string[];
}

export interface Forecast {
  horizonDays: number;
  expectedReturns: number;
  expectedRatePct: number;
  /** false when the backend answered but has no forecast yet (all zeros). */
  available: boolean;
}

export interface HospitalReport {
  patients: number;
  visits: number;
  returnRatePct: number;
  avgStayDays: number;
  riskMix: Record<RiskLevel, number>;
  byDischarge: { label: string; visits: number; returned: number; ratePct: number }[];
}

export interface TreatmentRow {
  name: string;
  patients: number;
  recoveryScore: number;
  returnRatePct: number;
  avgStayDays: number | null;
}

export interface CohortRow {
  anonId: string;
  ageGroup: string | null;
  gender: string | null;
  illness: string | null;
}

export interface AgeGroupCount {
  ageGroup: string;
  patients: number;
}

export interface ModelInfo {
  activeName: string;
  status: string;
  accuracyPct: number | null;
  recallPct: number | null;
  precisionPct: number | null;
  qualityPct: number | null; // ROC-AUC × 100
  all: { name: string; version: string; status: string; trainedOn: string | null; qualityPct: number | null }[];
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface NewUser {
  name: string;
  email: string;
  role: Role;
  password: string;
}

/** Everything the screens can ask for. live.ts and demo.ts both implement it. */
export interface DataSource {
  readonly mode: 'live' | 'demo';
  login(email: string, password: string): Promise<{ token: string; user: SessionUser }>;
  homeStats(): Promise<HomeStats>;
  patients(): Promise<PatientRow[]>;
  patient(id: number): Promise<PatientDetail>;
  /** Runs the AI model again for this patient (POST /risk/predict). */
  checkRisk(patient: PatientDetail): Promise<RiskResult>;
  careAdvice(patientId: number): Promise<CareAdvice>;
  forecast(horizonDays: number): Promise<Forecast>;
  hospitalReport(): Promise<HospitalReport>;
  treatments(): Promise<TreatmentRow[]>;
  cohort(): Promise<CohortRow[]>;
  ageGroups(): Promise<AgeGroupCount[]>;
  model(): Promise<ModelInfo>;
  users(): Promise<UserRow[]>;
  addUser(user: NewUser): Promise<UserRow>;
}
