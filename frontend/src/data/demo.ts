/**
 * demo.ts — SAMPLE data source, used only when NEXT_PUBLIC_DATA_MODE=demo.
 *
 * WHY KEEP IT: presentations/viva without a running backend. It reuses
 * Kiruthika's mock files (src/services/mock*.ts) so no sample data is
 * duplicated, and converts them to the SAME view models as live.ts.
 * Every screen shows a "sample data" banner in this mode (see AppShell).
 *
 * Unit note: the mock files store rates as percents (8.42) while the backend
 * sends fractions (0.0842) — that is why demo and live have separate mappings.
 * FLOWS NEXT: data/index.ts picks this when DATA_MODE === 'demo'.
 */
import { MOCK_PATIENTS, MOCK_DASHBOARD_STATS, MOCK_USERS } from '@/services/mockData';
import {
  MOCK_HOSPITAL_SUMMARY,
  MOCK_TREATMENT_EFFECTIVENESS,
} from '@/services/mockAnalyticsData';
import { generateMockClinicalSupport } from '@/services/mockClinicalSupportData';
import { generateMockForecastSummary } from '@/services/mockForecastData';
import { MOCK_ACTIVE_MODEL, MOCK_REGISTERED_MODELS } from '@/services/mockModelData';
import type { ForecastHorizon } from '@/types/forecast';
import { ApiError, readToken } from './http';
import { fractionToPct, fractionToPctOrNull, mapPatientDetail, type Json } from './mappers';
import type { DataSource, PatientDetail, Role, UserRow } from './types';

/** Small pause so loading states are visible in a demo, like a real network. */
const wait = <T>(value: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(value), ms));

/** Mock patients have the same field names as the backend → reuse the live mapper. */
const patientsVm = (): PatientDetail[] => MOCK_PATIENTS.map((p) => mapPatientDetail(p as unknown as Json));

// Users added during a demo live only in memory (lost on reload) — on purpose.
const extraUsers: UserRow[] = [];
let currentRole: Role = 'doctor';

export const demoData: DataSource = {
  mode: 'demo',

  async login(email) {
    // Demo: any password; email picks one of the 4 demo accounts (doctor if unknown).
    const account =
      Object.values(MOCK_USERS).find((a) => a.user.email.toLowerCase() === email.toLowerCase()) ??
      MOCK_USERS.doctor;
    currentRole = account.user.role;
    return wait({
      token: `demo-${account.user.role}`,
      user: { id: account.user.id, name: account.user.full_name, email: account.user.email, role: account.user.role },
    });
  },

  async homeStats() {
    // After a page reload the in-memory role is gone, so recover it from the demo token "demo-<role>".
    const fromToken = readToken()?.replace(/^demo-/, '') as Role | undefined;
    const role = fromToken && fromToken in MOCK_DASHBOARD_STATS ? fromToken : currentRole;
    const s = MOCK_DASHBOARD_STATS[role] ?? MOCK_DASHBOARD_STATS.doctor;
    return wait({
      patients: s.total_patients,
      visits: s.total_admissions,
      returned30: s.readmitted_within_30_days,
      returnRatePct: s.readmission_rate_percent,
      avgStayDays: s.average_length_of_stay_days,
      highRisk: s.high_risk_patients_count ?? 0,
    });
  },

  async patients() {
    return wait(patientsVm());
  },

  async patient(id) {
    const p = patientsVm().find((x) => x.id === id);
    if (!p) throw new ApiError('not_found', 'Patient not found', 404);
    return wait(p);
  },

  async checkRisk(p) {
    return wait({ patientId: p.id, riskPct: p.riskPct, risk: p.risk, modelName: MOCK_ACTIVE_MODEL.name, checkedAt: new Date().toISOString() }, 600);
  },

  async careAdvice(patientId) {
    const p = patientsVm().find((x) => x.id === patientId);
    const s = generateMockClinicalSupport(patientId, p?.name ?? `Patient ${patientId}`, p?.mrn ?? '', p?.illness ?? '');
    return wait({
      patientId,
      actions: s.recommendations.map((r) => r.protocol_action || r.title),
      followUpDays: s.follow_up_days,
      readyToGoHome: s.discharge_plan.ready_for_discharge,
      readinessPct: s.discharge_plan.readiness_score,
      afterHomeSteps: s.discharge_plan.post_discharge_instructions,
    });
  },

  async forecast(horizonDays) {
    const key = `${horizonDays}d` as ForecastHorizon;
    const f = generateMockForecastSummary(key, 'hospital');
    return wait({ horizonDays, expectedReturns: f.predictedReadmissions, expectedRatePct: f.projectedRate, available: true });
  },

  async hospitalReport() {
    const s = MOCK_HOSPITAL_SUMMARY;
    return wait({
      patients: s.total_patients,
      visits: s.total_admissions,
      returnRatePct: s.readmission_rate, // mock already in percent
      avgStayDays: s.average_length_of_stay,
      riskMix: s.risk_distribution,
      byDischarge: (s.department_breakdown ?? []).map((d) => ({
        label: d.department,
        visits: d.totalAdmissions,
        returned: Math.round((d.totalAdmissions * d.readmissionRate) / 100),
        ratePct: d.readmissionRate,
      })),
    });
  },

  async treatments() {
    return wait(
      MOCK_TREATMENT_EFFECTIVENESS.map((t) => ({
        name: t.treatment_name,
        patients: t.patients_treated,
        recoveryScore: t.average_recovery_score,
        returnRatePct: t.readmission_rate, // mock already in percent
        avgStayDays: t.average_los_days ?? null,
      })),
    );
  },

  async cohort() {
    // Same anonymisation as live: no names, no MRN, sequential anon IDs.
    return wait(
      MOCK_PATIENTS.map((p, i) => ({
        anonId: `A-${String(i + 1).padStart(4, '0')}`,
        ageGroup: p.age_group,
        gender: p.gender,
        illness: p.primary_diagnosis,
      })),
    );
  },

  async ageGroups() {
    const counts = new Map<string, number>();
    MOCK_PATIENTS.forEach((p) => counts.set(p.age_group ?? '—', (counts.get(p.age_group ?? '—') ?? 0) + 1));
    return wait([...counts].map(([ageGroup, patients]) => ({ ageGroup, patients })));
  },

  async model() {
    const a = MOCK_ACTIVE_MODEL;
    return wait({
      activeName: a.name,
      status: a.status,
      accuracyPct: fractionToPctOrNull(a.metrics.accuracy),
      recallPct: fractionToPctOrNull(a.metrics.recall),
      precisionPct: fractionToPctOrNull(a.metrics.precision),
      qualityPct: fractionToPctOrNull(a.metrics.roc_auc),
      all: MOCK_REGISTERED_MODELS.map((r) => ({
        name: r.name,
        version: r.version,
        status: r.status,
        trainedOn: r.trainedDate,
        qualityPct: r.metrics.roc_auc === null ? null : fractionToPct(r.metrics.roc_auc),
      })),
    });
  },

  async users() {
    const base = Object.values(MOCK_USERS).map((a) => ({
      id: a.user.id,
      name: a.user.full_name,
      email: a.user.email,
      role: a.user.role,
      active: a.user.is_active,
    }));
    return wait([...base, ...extraUsers]);
  },

  async addUser(u) {
    const row: UserRow = { id: 1000 + extraUsers.length, name: u.name, email: u.email, role: u.role, active: true };
    extraUsers.push(row);
    return wait(row);
  },
};

/** Demo accounts shown as one-tap buttons on the sign-in page (demo mode only). */
export const DEMO_ACCOUNTS = (Object.keys(MOCK_USERS) as Role[]).map((role) => ({
  role,
  email: MOCK_USERS[role].user.email,
}));
