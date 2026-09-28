'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import type { Patient, RiskCategory, RiskPrediction } from '@/types';

interface Forecast {
  scope: string;
  horizon_days: number;
  predicted_readmissions: number;
  predicted_rate: number;
}

const AGE_GROUPS = [
  '0-10', '10-20', '20-30', '30-40', '40-50',
  '50-60', '60-70', '70-80', '80-90', '90-100',
] as const;

const CATEGORY_STYLES: Record<RiskCategory, string> = {
  low: 'bg-risk-low/10 text-risk-low',
  medium: 'bg-risk-medium/15 text-yellow-700',
  high: 'bg-risk-high/10 text-risk-high',
};

const HORIZON_OPTIONS = [30, 60, 90];

export default function RiskDashboardPage() {
  const { token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [highRisk, setHighRisk] = useState<RiskPrediction[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [horizon, setHorizon] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    patient_id: '',
    time_in_hospital: '5',
    num_medications: '10',
    num_lab_procedures: '30',
    number_diagnoses: '5',
    number_inpatient: '0',
    number_emergency: '0',
    age_group: AGE_GROUPS[5] as string,
  });
  const [assessment, setAssessment] = useState<RiskPrediction | null>(null);
  const [assessError, setAssessError] = useState<string | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<Patient[]>('/patients', {}, token).catch(() => []),
      apiFetch<RiskPrediction[]>('/risk/high-risk', {}, token),
    ])
      .then(([patientData, highRiskData]) => {
        setPatients(patientData);
        setHighRisk(highRiskData);
      })
      .catch(() => setError('Could not load risk data.'))
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    apiFetch<Forecast>(`/risk/forecast?horizon_days=${horizon}`, {}, token)
      .then(setForecast)
      .catch(() => setError('Could not load forecast.'));
  }, [token, horizon]);

  async function handleAssess(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setAssessError(null);
    setIsAssessing(true);
    try {
      const result = await apiFetch<RiskPrediction>(
        '/risk/predict',
        {
          method: 'POST',
          body: JSON.stringify({
            patient_id: Number(form.patient_id),
            time_in_hospital: Number(form.time_in_hospital),
            num_medications: Number(form.num_medications),
            num_lab_procedures: Number(form.num_lab_procedures),
            number_diagnoses: Number(form.number_diagnoses),
            number_inpatient: Number(form.number_inpatient),
            number_emergency: Number(form.number_emergency),
            age_group: form.age_group,
          }),
        },
        token,
      );
      setAssessment(result);
      apiFetch<RiskPrediction[]>('/risk/high-risk', {}, token).then(setHighRisk).catch(() => {});
      apiFetch<Forecast>(`/risk/forecast?horizon_days=${horizon}`, {}, token).then(setForecast).catch(() => {});
    } catch (err) {
      setAssessError(
        err instanceof ApiError ? 'Could not score this patient. Check the values entered.' : 'Something went wrong.',
      );
    } finally {
      setIsAssessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Risk prediction</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Hospital readmission monitoring</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-500">
        Review current risk indicators, score an admission, and inspect model-derived factors affecting the prediction.
      </p>

      {error && <p className="mt-4 text-sm text-risk-high">{error}</p>}

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        <StatCard label="Visible patients" value={isLoading ? '—' : String(patients.length)} />
        <StatCard label="High-risk patients" value={isLoading ? '—' : String(highRisk.length)} />
        <StatCard label="Expected readmissions" value={forecast ? String(forecast.predicted_readmissions) : '—'} />
        <StatCard label="Predicted rate" value={forecast ? `${(forecast.predicted_rate * 100).toFixed(1)}%` : '—'} />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Readmission forecast</h2>
              <p className="mt-1 text-xs text-slate-500">Probability-weighted estimate based on the latest available patient predictions.</p>
            </div>
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-xs"
            >
              {HORIZON_OPTIONS.map((h) => (
                <option key={h} value={h}>{h} days</option>
              ))}
            </select>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Forecast horizon</p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-lg font-medium">{forecast?.horizon_days ?? '—'} days</p>
            </div>
            <div>
              <p className="text-slate-500">Expected cases</p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-lg font-medium">{forecast?.predicted_readmissions ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Predicted rate</p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-lg font-medium">
                {forecast ? `${(forecast.predicted_rate * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-sm font-semibold">Model information</h2>
          <p className="mt-1 text-xs text-slate-500">Model currently used for risk scoring.</p>
          {assessment ? (
            <>
              <dl className="mt-5 grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-slate-500">Model</dt>
                <dd className="text-right font-[family-name:var(--font-mono)] text-xs">{assessment.model_name}</dd>
                <dt className="text-slate-500">Version</dt>
                <dd className="text-right font-[family-name:var(--font-mono)] text-xs">{assessment.model_version}</dd>
                <dt className="text-slate-500">Target</dt>
                <dd className="text-right">Readmission</dd>
                <dt className="text-slate-500">Horizon</dt>
                <dd className="text-right">30 days</dd>
              </dl>
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <p className="text-xs font-medium text-slate-500">Contributing factors</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {assessment.risk_factors.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-slate-400">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="mt-5 text-sm text-slate-400">Run an assessment below to see model details.</p>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-sm font-semibold">Patient risk assessment</h2>
        <p className="mt-1 text-xs text-slate-500">Enter the admission characteristics required by the readmission model.</p>

        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <form onSubmit={handleAssess} className="space-y-4">
            <Field label="Patient">
              <select
                required
                value={form.patient_id}
                onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              >
                <option value="" disabled>Select a patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.medical_record_number} — {p.primary_diagnosis ?? 'No diagnosis on file'}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Length of stay (days)">
                <NumberInput value={form.time_in_hospital} onChange={(v) => setForm({ ...form, time_in_hospital: v })} min={1} max={14} />
              </Field>
              <Field label="Number of medications">
                <NumberInput value={form.num_medications} onChange={(v) => setForm({ ...form, num_medications: v })} min={0} />
              </Field>
              <Field label="Lab procedures">
                <NumberInput value={form.num_lab_procedures} onChange={(v) => setForm({ ...form, num_lab_procedures: v })} min={0} />
              </Field>
              <Field label="Diagnoses recorded">
                <NumberInput value={form.number_diagnoses} onChange={(v) => setForm({ ...form, number_diagnoses: v })} min={0} />
              </Field>
              <Field label="Prior inpatient stays">
                <NumberInput value={form.number_inpatient} onChange={(v) => setForm({ ...form, number_inpatient: v })} min={0} />
              </Field>
              <Field label="Prior ER visits">
                <NumberInput value={form.number_emergency} onChange={(v) => setForm({ ...form, number_emergency: v })} min={0} />
              </Field>
            </div>

            <Field label="Age group">
              <select
                value={form.age_group}
                onChange={(e) => setForm({ ...form, age_group: e.target.value })}
                className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              >
                {AGE_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>

            {assessError && <p className="text-sm text-risk-high">{assessError}</p>}

            <button
              type="submit"
              disabled={isAssessing}
              className="w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isAssessing ? 'Scoring…' : 'Assess risk'}
            </button>
          </form>

          <div className="flex flex-col justify-center rounded-lg border border-dashed border-[var(--border)] p-6">
            {assessment ? (
              <>
                <p className="text-xs text-slate-500">Latest assessment</p>
                <p className="mt-2 font-[family-name:var(--font-mono)] text-4xl font-semibold">
                  {(assessment.readmission_probability * 100).toFixed(1)}<span className="text-lg text-slate-400">%</span>
                </p>
                <span className={`mt-3 inline-block w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${CATEGORY_STYLES[assessment.risk_category]}`}>
                  {assessment.risk_category} risk
                </span>
              </>
            ) : (
              <p className="text-center text-sm text-slate-400">Results will appear here once you assess a patient.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-slate-500">High-risk patients</h2>
        {highRisk.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
            <p className="text-sm text-slate-500">No patients are currently in the high-risk band.</p>
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Probability</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                </tr>
              </thead>
              <tbody>
                {highRisk.map((r) => (
                  <tr key={r.patient_id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-medium">#{r.patient_id}</td>
                    <td className="px-4 py-3 font-[family-name:var(--font-mono)]">{(r.readmission_probability * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${CATEGORY_STYLES[r.risk_category]}`}>
                        {r.risk_category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.model_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-mono)] text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function NumberInput({ value, onChange, min, max }: { value: string; onChange: (v: string) => void; min?: number; max?: number }) {
  return (
    <input
      type="number" required min={min} max={max}
      value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
    />
  );
}