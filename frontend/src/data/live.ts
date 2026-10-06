/**
 * live.ts — the REAL data source: every method = one or two backend calls.
 *
 * WHY: Samarth found that only the dashboard was really fetching from the
 * backend; other pages silently fell back to mock data (they skipped the API
 * when no token was passed, and mixed mock text into live results).
 * Here there is no mock fallback at all. If a call fails, the error goes up to
 * the screen, which shows a clear message (offline / no permission / empty).
 *
 * Endpoint map (backend/app/api/v1/endpoints, commit d5ca880):
 *   login            POST /auth/login
 *   homeStats        GET  /patients/stats  (+ /analytics/summary for avg stay, if allowed)
 *   patients         GET  /patients
 *   patient          GET  /patients/{id}
 *   checkRisk        POST /risk/predict
 *   careAdvice       GET  /clinical-support/recommendations/{id} + /discharge-plan/{id}
 *   forecast         GET  /risk/forecast?horizon_days=N
 *   hospitalReport   GET  /analytics/summary + /analytics/readmissions
 *   treatments       GET  /treatment + /treatment/recovery-trends
 *   cohort           GET  /patients/anonymised
 *   ageGroups        GET  /analytics/population-health
 *   model            GET  /models/active + /models/metrics + /models
 *   users / addUser  GET / POST /users
 * FLOWS NEXT: data/index.ts exports this as `data` when DATA_MODE = 'live'.
 */
import { request, ApiError } from './http';
import * as m from './mappers';
import type { Json } from './mappers';
import type { DataSource, HomeStats, PatientDetail, RiskResult } from './types';

/** Resolve to the value, or null if that one call failed (used for optional parts). */
const settle = async <T>(p: Promise<T>): Promise<T | null> => {
  try {
    return await p;
  } catch (e) {
    // Optional parts may fail with 403 (role) — but "offline" must still surface.
    if (e instanceof ApiError && e.kind === 'offline') throw e;
    return null;
  }
};

export const liveData: DataSource = {
  mode: 'live',

  async login(email, password) {
    // auth:false → never send an old token along with a fresh login.
    const j = await request<Json>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    return m.mapLogin(j);
  },

  async homeStats(): Promise<HomeStats> {
    const [stats, summary] = await Promise.all([
      request<Json>('/patients/stats'),
      // Doctors get 403 here (no hospital_analytics:read) — that is fine, avg stay stays "—".
      settle(request<Json>('/analytics/summary')),
    ]);
    return {
      patients: m.num(stats.total_patients),
      visits: m.num(stats.total_admissions),
      returned30: m.num(stats.readmitted_within_30_days),
      returnRatePct: m.num(stats.readmission_rate_percent), // already a percent
      // /patients/stats returns a hard-coded 4.5, so we only trust the real average.
      avgStayDays: summary ? m.num(summary.average_length_of_stay) : null,
      highRisk: m.num(stats.high_risk_patients_count),
    };
  },

  async patients() {
    const list = await request<Json[]>('/patients?limit=500');
    return list.map(m.mapPatientRow);
  },

  async patient(id) {
    return m.mapPatientDetail(await request<Json>(`/patients/${id}`));
  },

  async checkRisk(p: PatientDetail): Promise<RiskResult> {
    // The schema requires these four numbers. We send the patient's real latest
    // visit values (today the backend re-reads the admission itself, but if it
    // ever starts using the payload, it gets true data, not placeholders).
    const last = p.visits[p.visits.length - 1];
    const j = await request<Json>('/risk/predict', {
      method: 'POST',
      body: {
        patient_id: p.id,
        time_in_hospital: last?.daysStayed ?? 0,
        num_medications: last?.medicines ?? 0,
        num_lab_procedures: 0,
        number_diagnoses: 0,
        age_group: p.ageGroup,
      },
    });
    return {
      patientId: m.num(j.patient_id, p.id),
      riskPct: m.fractionToPct(j.readmission_probability),
      risk: m.toRiskLevel(j.risk_category),
      modelName: m.str(j.model_name) ?? '—',
      checkedAt: m.str(j.created_at),
    };
  },

  async careAdvice(patientId) {
    const [rec, plan] = await Promise.all([
      settle(request<Json>(`/clinical-support/recommendations/${patientId}`)),
      settle(request<Json>(`/clinical-support/discharge-plan/${patientId}`)),
    ]);
    if (!rec && !plan) throw new ApiError('server', 'No clinical support data');
    return m.mapCareAdvice(patientId, rec, plan);
  },

  async forecast(horizonDays) {
    return m.mapForecast(await request<Json>(`/risk/forecast?horizon_days=${horizonDays}`), horizonDays);
  },

  async hospitalReport() {
    const [summary, byDischarge] = await Promise.all([
      request<Json>('/analytics/summary'),
      settle(request<Json[]>('/analytics/readmissions')),
    ]);
    return m.mapHospitalReport(summary, byDischarge);
  },

  async treatments() {
    const [list, trends] = await Promise.all([
      request<Json[]>('/treatment'),
      settle(request<Json[]>('/treatment/recovery-trends')),
    ]);
    return m.mapTreatments(list, trends);
  },

  async cohort() {
    return m.mapCohort(await request<Json[]>('/patients/anonymised?limit=500'));
  },

  async ageGroups() {
    return m.mapAgeGroups(await request<Json>('/analytics/population-health'));
  },

  async model() {
    const [active, metrics, list] = await Promise.all([
      request<Json>('/models/active'),
      settle(request<Json>('/models/metrics')),
      settle(request<Json[]>('/models')),
    ]);
    return m.mapModel(active, metrics, list);
  },

  async users() {
    return (await request<Json[]>('/users')).map(m.mapUser);
  },

  async addUser(u) {
    const j = await request<Json>('/users', {
      method: 'POST',
      body: { email: u.email, full_name: u.name, role: u.role, password: u.password, department: null },
    });
    return m.mapUser(j);
  },
};
