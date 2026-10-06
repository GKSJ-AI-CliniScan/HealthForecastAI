/**
 * mappers.ts — backend JSON  ➜  screen view models (types.ts).
 *
 * WHY PURE FUNCTIONS IN THEIR OWN FILE: no fetch, no React, no '@/' imports,
 * so `node --test` can run them directly (tests/mappers.test.mjs). Every
 * shape mismatch we found between backend and old frontend is fixed HERE and
 * pinned by a test, so it cannot silently come back.
 *
 * Backend facts these rely on (read from backend/app on commit d5ca880):
 *   - risk scores, readmission_rate (analytics + treatment) and model metrics
 *     are FRACTIONS 0–1  → we multiply by 100
 *   - /patients/stats readmission_rate_percent is ALREADY a percent
 *   - /analytics/readmissions is grouped by discharge_disposition, not by month
 * FLOWS NEXT: live.ts calls these on every response.
 */
import type {
  AgeGroupCount,
  CareAdvice,
  CohortRow,
  Forecast,
  HospitalReport,
  ModelInfo,
  PatientDetail,
  PatientRow,
  RiskLevel,
  Role,
  SessionUser,
  TreatmentRow,
  UserRow,
  Visit,
} from './types';

// Loose JSON object type: backend answers are untrusted input, so every
// field is read defensively with the helpers below.
export type Json = Record<string, unknown>;

/** Number or fallback — protects against null/strings/NaN from the API. */
export const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
};
export const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null;
export const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' && v !== 'None' ? v : null;

/** 0.1123 → 11.2 (one decimal). Clamped so a bad value can never show "430 %". */
export const fractionToPct = (v: unknown): number =>
  Math.round(Math.min(Math.max(num(v), 0), 1) * 1000) / 10;
export const fractionToPctOrNull = (v: unknown): number | null =>
  numOrNull(v) === null ? null : fractionToPct(v);

/** Anything that is not "high"/"medium" counts as low (backend default is "low"). */
export const toRiskLevel = (v: unknown): RiskLevel =>
  v === 'high' || v === 'medium' ? v : 'low';

const ROLES: Role[] = ['doctor', 'hospital_admin', 'researcher', 'system_admin'];
export const toRole = (v: unknown): Role => (ROLES.includes(v as Role) ? (v as Role) : 'doctor');

// ---------------------------------------------------------------- auth
/** POST /auth/login → Token { access_token, role, user: UserRead } */
export function mapLogin(j: Json): { token: string; user: SessionUser } {
  const u = (j.user ?? {}) as Json;
  const token = str(j.access_token);
  if (!token) throw new Error('Login response had no access_token');
  return {
    token,
    user: {
      id: num(u.id),
      name: str(u.full_name) ?? str(u.email) ?? 'User',
      email: str(u.email) ?? '',
      role: toRole(j.role ?? u.role),
    },
  };
}

// ---------------------------------------------------------------- patients
/** One item of GET /patients (also the head of GET /patients/{id}). */
export function mapPatientRow(j: Json): PatientRow {
  const mrn = str(j.medical_record_number) ?? String(num(j.id));
  return {
    id: num(j.id),
    mrn,
    name: str(j.full_name) ?? `Patient ${mrn}`,
    ageGroup: str(j.age_group),
    gender: str(j.gender),
    illness: str(j.primary_diagnosis),
    risk: toRiskLevel(j.risk_category),
    riskPct: fractionToPct(j.readmission_risk_score),
  };
}

/** Dataset codes: "<30" = came back within 30 days, ">30"/"NO" = did not. */
export function mapVisit(j: Json): Visit {
  const r = str(j.readmitted);
  return {
    id: num(j.id),
    admittedOn: str(j.admission_date),
    daysStayed: numOrNull(j.time_in_hospital),
    type: str(j.admission_type),
    leftHow: str(j.discharge_disposition),
    medicines: numOrNull(j.num_medications),
    returned30: r === '<30' ? true : r === null ? null : false,
  };
}

export function mapPatientDetail(j: Json): PatientDetail {
  const visits = Array.isArray(j.admissions) ? (j.admissions as Json[]).map(mapVisit) : [];
  return { ...mapPatientRow(j), visits };
}

// ---------------------------------------------------------------- clinical support
/** Recommendations may be plain strings (current backend) or objects (older schema). */
export function adviceText(item: unknown): string | null {
  if (typeof item === 'string') return str(item);
  if (item && typeof item === 'object') {
    const o = item as Json;
    return str(o.protocol_action) ?? str(o.action) ?? str(o.title);
  }
  return null;
}

export function mapCareAdvice(patientId: number, rec: Json | null, plan: Json | null): CareAdvice {
  const list = (v: unknown) =>
    Array.isArray(v) ? v.map(adviceText).filter((s): s is string => s !== null) : [];
  return {
    patientId,
    actions: list(rec?.recommendations),
    followUpDays: rec ? numOrNull(rec.follow_up_days) : null,
    readyToGoHome:
      plan && typeof plan.ready_for_discharge === 'boolean' ? plan.ready_for_discharge : null,
    // readiness_score is already 0–100 in cds_service.py
    readinessPct: plan ? numOrNull(plan.readiness_score) : null,
    afterHomeSteps: list(plan?.risk_mitigation),
  };
}

// ---------------------------------------------------------------- forecast
/** GET /risk/forecast is still a TODO stub that returns zeros → available=false. */
export function mapForecast(j: Json, horizonDays: number): Forecast {
  const expectedReturns = num(j.predicted_readmissions);
  const expectedRatePct = fractionToPct(j.predicted_rate);
  return {
    horizonDays: num(j.horizon_days, horizonDays),
    expectedReturns,
    expectedRatePct,
    available: expectedReturns > 0 || expectedRatePct > 0,
  };
}

// ---------------------------------------------------------------- analytics
export function mapHospitalReport(summary: Json, byDischarge: unknown): HospitalReport {
  const mix = (summary.risk_distribution ?? {}) as Json;
  return {
    patients: num(summary.total_patients),
    visits: num(summary.total_admissions),
    returnRatePct: fractionToPct(summary.readmission_rate),
    avgStayDays: num(summary.average_length_of_stay),
    riskMix: { low: num(mix.low), medium: num(mix.medium), high: num(mix.high) },
    byDischarge: (Array.isArray(byDischarge) ? (byDischarge as Json[]) : []).map((r) => ({
      label: str(r.discharge_disposition) ?? 'Unknown',
      visits: num(r.total_admissions),
      returned: num(r.readmissions),
      ratePct: fractionToPct(r.readmission_rate),
    })),
  };
}

/** Joins GET /treatment with GET /treatment/recovery-trends (avg stay) by name. */
export function mapTreatments(list: unknown, trends: unknown): TreatmentRow[] {
  const stayByName = new Map<string, number>();
  if (Array.isArray(trends)) {
    for (const t of trends as Json[]) {
      const name = str(t.treatment_name);
      if (name) stayByName.set(name, num(t.average_length_of_stay));
    }
  }
  return (Array.isArray(list) ? (list as Json[]) : []).map((t) => {
    const name = str(t.treatment_name) ?? '—';
    return {
      name,
      patients: num(t.patients_treated),
      recoveryScore: num(t.average_recovery_score),
      returnRatePct: fractionToPct(t.readmission_rate),
      avgStayDays: stayByName.get(name) ?? null,
    };
  });
}

// ---------------------------------------------------------------- research
/** GET /patients/anonymised. We deliberately do NOT carry `race` to the UI. */
export function mapCohort(list: unknown): CohortRow[] {
  return (Array.isArray(list) ? (list as Json[]) : []).map((r, i) => ({
    anonId: `A-${String(i + 1).padStart(4, '0')}`, // not the DB id: avoids re-identification
    ageGroup: str(r.age_group),
    gender: str(r.gender),
    illness: str(r.primary_diagnosis),
  }));
}

/** GET /analytics/population-health → { cohorts: [{cohort, patient_count}] } */
export function mapAgeGroups(j: Json): AgeGroupCount[] {
  const cohorts = Array.isArray(j.cohorts) ? (j.cohorts as Json[]) : [];
  return cohorts.map((c) => ({ ageGroup: str(c.cohort) ?? '—', patients: num(c.patient_count) }));
}

// ---------------------------------------------------------------- models
export function mapModel(active: Json | null, metrics: Json | null, list: unknown): ModelInfo {
  return {
    activeName: str(active?.name) ?? str(active?.model_name) ?? '—',
    status: str(active?.status) ?? '—',
    accuracyPct: fractionToPctOrNull(metrics?.accuracy),
    recallPct: fractionToPctOrNull(metrics?.recall),
    precisionPct: fractionToPctOrNull(metrics?.precision),
    qualityPct: fractionToPctOrNull(metrics?.roc_auc),
    all: (Array.isArray(list) ? (list as Json[]) : []).map((m) => ({
      name: str(m.name) ?? str(m.model_name) ?? '—',
      version: str(m.version) ?? '—',
      status: str(m.status) ?? '—',
      trainedOn: str(m.trained_date) ?? str(m.trained_at),
      qualityPct: fractionToPctOrNull(m.roc_auc ?? (m.metrics as Json | undefined)?.roc_auc),
    })),
  };
}

// ---------------------------------------------------------------- users
export function mapUser(j: Json): UserRow {
  return {
    id: num(j.id),
    name: str(j.full_name) ?? '—',
    email: str(j.email) ?? '—',
    role: toRole(j.role),
    active: j.is_active !== false,
  };
}
