'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Patient, RiskCategory, RiskPrediction } from '@/types';

interface TreatmentOutcome {
  id: number;
  patient_id: number;
  treatment_type: string;
  outcome_status: string;
  recovery_days: number | null;
  effectiveness_score: number | null;
  created_at: string;
}

const CATEGORY_STYLES: Record<RiskCategory, string> = {
  low: 'bg-risk-low/10 text-risk-low',
  medium: 'bg-risk-medium/15 text-yellow-700',
  high: 'bg-risk-high/10 text-risk-high',
};

const BAR_COLOR: Record<RiskCategory, string> = {
  low: 'bg-risk-low',
  medium: 'bg-risk-medium',
  high: 'bg-risk-high',
};

const AGE_GROUPS = ['0-10','10-20','20-30','30-40','40-50','50-60','60-70','70-80','80-90','90-100'];

export default function PatientsRegistryPage() {
  const { token, role, permissions } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [scores, setScores] = useState<Map<number, RiskPrediction>>(new Map());
  const [latestTreatment, setLatestTreatment] = useState<Map<number, TreatmentOutcome>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    medical_record_number: '', age_group: '[50-60)', gender: 'Male',
    primary_diagnosis: 'Diabetes', assigned_doctor_id: '',
  });

  const isResearcher = role === 'researcher';
  const canSeeScores = permissions.includes('risk_report:read');
  const canCreatePatient = permissions.includes('patient:write');

  function loadRegistry() {
    if (!token) return;
    setIsLoading(true);
    apiFetch<Patient[]>('/patients', {}, token)
      .then(async (patientData) => {
        setPatients(patientData);

        if (canSeeScores) {
          const scoreData = await apiFetch<RiskPrediction[]>('/risk/scores', {}, token);
          setScores(new Map(scoreData.map((s) => [s.patient_id, s])));
        }

        const histories = await Promise.all(
          patientData.map((p) =>
            apiFetch<TreatmentOutcome[]>(`/treatment/patient/${p.id}`, {}, token).catch(() => [])
          )
        );
        const latestMap = new Map<number, TreatmentOutcome>();
        histories.forEach((history, i) => {
          if (history.length > 0) latestMap.set(patientData[i].id, history[0]);
        });
        setLatestTreatment(latestMap);
      })
      .catch(() => setError('Could not load the patient registry.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (isResearcher) { setIsLoading(false); return; }
    loadRegistry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isResearcher, canSeeScores]);

  async function handleCreatePatient(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreateError(null);
    try {
      await apiFetch('/patients', {
        method: 'POST',
        body: JSON.stringify({ ...form, assigned_doctor_id: form.assigned_doctor_id ? Number(form.assigned_doctor_id) : null }),
      }, token);
      setShowCreate(false);
      setForm({ medical_record_number: '', age_group: '[50-60)', gender: 'Male', primary_diagnosis: 'Diabetes', assigned_doctor_id: '' });
      loadRegistry();
    } catch {
      setCreateError('Could not create patient. Check the medical record number is unique.');
    }
  }

  if (isResearcher) {
    return (
      <div className="mx-auto max-w-6xl px-8 py-10">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Risk prediction</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Patients registry</h1>
        <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
          <p className="text-sm text-slate-500">
            Researchers view de-identified data only.{' '}
            <Link href="/dashboard/research" className="font-medium text-slate-900 underline">Go to Research Cohort →</Link>
          </p>
        </div>
      </div>
    );
  }

  const scored = patients.map((p) => ({ patient: p, score: scores.get(p.id), treatment: latestTreatment.get(p.id) }));
  const withScore = scored.filter((r) => r.score);
  const counts = { low: 0, medium: 0, high: 0 };
  let probabilitySum = 0;
  for (const { score } of withScore) {
    if (score) { counts[score.risk_category] += 1; probabilitySum += score.readmission_probability; }
  }
  const cohortAverage = withScore.length ? probabilitySum / withScore.length : 0;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Risk prediction</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Patients registry</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-500">Every visible patient with their latest risk score and treatment status.</p>

      {error && <p className="mt-4 text-sm text-risk-high">{error}</p>}

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        <StatCard label="Cohort readmission risk" value={`${(cohortAverage * 100).toFixed(1)}%`} />
        <StatCard label="High risk" value={String(counts.high)} accent="text-risk-high" />
        <StatCard label="Medium risk" value={String(counts.medium)} accent="text-yellow-700" />
        <StatCard label="Low risk" value={String(counts.low)} accent="text-risk-low" />
      </section>

      {canCreatePatient && (
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500">Registered patients</h2>
          <button onClick={() => setShowCreate(!showCreate)} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            {showCreate ? 'Cancel' : '+ New patient'}
          </button>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreatePatient} className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <input required placeholder="Medical record number" value={form.medical_record_number} onChange={(e) => setForm({ ...form, medical_record_number: e.target.value })} className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm" />
          <input required placeholder="Assigned doctor ID" value={form.assigned_doctor_id} onChange={(e) => setForm({ ...form, assigned_doctor_id: e.target.value })} className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm" />
          <select value={form.age_group} onChange={(e) => setForm({ ...form, age_group: e.target.value })} className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm">
            {AGE_GROUPS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <input placeholder="Primary diagnosis" value={form.primary_diagnosis} onChange={(e) => setForm({ ...form, primary_diagnosis: e.target.value })} className="col-span-2 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm" />
          {createError && <p className="col-span-2 text-sm text-risk-high">{createError}</p>}
          <button type="submit" className="col-span-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">Create patient</button>
        </form>
      )}

      <section className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">MRN</th>
              <th className="px-4 py-3 font-medium">Age / Gender</th>
              <th className="px-4 py-3 font-medium">Diagnosis</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Readmission risk</th>
              <th className="px-4 py-3 font-medium">Latest treatment</th>
            </tr>
          </thead>
          <tbody>
            {scored.map(({ patient, score, treatment }) => (
              <tr key={patient.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs">{patient.medical_record_number}</td>
                <td className="px-4 py-3">{patient.age_group ?? '—'} · {patient.gender ?? '—'}</td>
                <td className="px-4 py-3">{patient.primary_diagnosis ?? '—'}</td>
                <td className="px-4 py-3">
                  {score ? (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${CATEGORY_STYLES[score.risk_category]}`}>{score.risk_category}</span>
                  ) : <span className="text-xs text-slate-400">Not yet scored</span>}
                </td>
                <td className="px-4 py-3">
                  {score ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full ${BAR_COLOR[score.risk_category]}`} style={{ width: `${Math.min(score.readmission_probability * 100, 100)}%` }} />
                      </div>
                      <span className="font-[family-name:var(--font-mono)] text-xs">{(score.readmission_probability * 100).toFixed(0)}%</span>
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {treatment ? (
                    <span className="text-xs">{treatment.treatment_type.replace(/_/g, ' ')} — <span className="capitalize">{treatment.outcome_status}</span></span>
                  ) : <span className="text-xs text-slate-400">None logged</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && scored.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No patients visible to this role yet.</p>}
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 font-[family-name:var(--font-mono)] text-2xl font-semibold ${accent ?? ''}`}>{value}</p>
    </div>
  );
}