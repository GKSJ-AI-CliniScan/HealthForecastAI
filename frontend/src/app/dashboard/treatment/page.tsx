'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import type { Patient, TreatmentEffectivenessSummary, RecoveryTrendPoint } from '@/types';

const TREATMENT_TYPES = [
  'insulin_therapy', 'metformin', 'sulfonylurea',
  'lifestyle_intervention', 'oral_hypoglycemics', 'combination_therapy',
] as const;

const OUTCOME_STATUSES = ['improved', 'unchanged', 'worsened'] as const;

export default function TreatmentEffectivenessPage() {
  const { token, permissions } = useAuth();
  const [summary, setSummary] = useState<TreatmentEffectivenessSummary | null>(null);
  const [trends, setTrends] = useState<RecoveryTrendPoint[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canLogTreatment = permissions.includes('treatment_report:read');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patient_id: '',
    treatment_type: TREATMENT_TYPES[1] as string,
    outcome_status: OUTCOME_STATUSES[0] as string,
    recovery_days: '10',
    effectiveness_score: '0.6',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function loadData() {
    if (!token) return;
    setIsLoading(true);
    const query = filterType ? `?treatment_type=${filterType}` : '';
    Promise.all([
      apiFetch<TreatmentEffectivenessSummary>(`/treatment${query}`, {}, token),
      apiFetch<RecoveryTrendPoint[]>('/treatment/recovery-trends', {}, token),
      apiFetch<Patient[]>('/patients', {}, token).catch(() => []),
    ])
      .then(([summaryData, trendData, patientData]) => {
        setSummary(summaryData);
        setTrends(trendData);
        setPatients(patientData);
      })
      .catch(() => setError('Could not load treatment effectiveness data.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filterType]);

  async function handleLogTreatment(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiFetch(
        '/treatment',
        {
          method: 'POST',
          body: JSON.stringify({
            patient_id: Number(form.patient_id),
            treatment_type: form.treatment_type,
            outcome_status: form.outcome_status,
            recovery_days: form.recovery_days ? Number(form.recovery_days) : null,
            effectiveness_score: form.effectiveness_score ? Number(form.effectiveness_score) : null,
          }),
        },
        token,
      );
      setShowForm(false);
      setForm({ ...form, patient_id: '' });
      loadData(); // refresh summary + trend chart with the new record included
    } catch (err) {
      setFormError(
        err instanceof ApiError ? 'Could not log this outcome. Check the patient and values entered.' : 'Something went wrong.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const chartData = trends.map((t) => ({
    month: t.month,
    effectiveness: t.avg_effectiveness != null ? Math.round(t.avg_effectiveness * 1000) / 10 : null,
    cases: t.case_count,
  }));

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Treatment Effectiveness</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Diabetes treatment outcomes</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Aggregated recovery and effectiveness data across recorded diabetes treatments.
          </p>
        </div>
        {canLogTreatment && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="shrink-0 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {showForm ? 'Cancel' : '+ Log treatment outcome'}
          </button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-risk-high">{error}</p>}

      {showForm && (
        <form onSubmit={handleLogTreatment} className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:grid-cols-4">
          <select
            required
            value={form.patient_id}
            onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
            className="col-span-2 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm sm:col-span-1"
          >
            <option value="" disabled>Select patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.medical_record_number}</option>
            ))}
          </select>
          <select
            value={form.treatment_type}
            onChange={(e) => setForm({ ...form, treatment_type: e.target.value })}
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          >
            {TREATMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={form.outcome_status}
            onChange={(e) => setForm({ ...form, outcome_status: e.target.value })}
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          >
            {OUTCOME_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Recovery days"
            value={form.recovery_days}
            onChange={(e) => setForm({ ...form, recovery_days: e.target.value })}
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            placeholder="Effectiveness (0-1)"
            value={form.effectiveness_score}
            onChange={(e) => setForm({ ...form, effectiveness_score: e.target.value })}
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          />
          {formError && <p className="col-span-full text-sm text-risk-high">{formError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="col-span-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 sm:col-span-1"
          >
            {isSubmitting ? 'Saving…' : 'Save outcome'}
          </button>
        </form>
      )}

      <div className="mt-6">
        <label className="text-xs font-medium text-slate-500">Filter by treatment type</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="mt-1.5 block rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="">All treatment types</option>
          {TREATMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total cases" value={isLoading ? '—' : String(summary?.total_cases ?? 0)} />
        <StatCard
          label="Improved rate"
          value={isLoading ? '—' : `${((summary?.improved_rate ?? 0) * 100).toFixed(1)}%`}
        />
        <StatCard
          label="Avg recovery days"
          value={isLoading ? '—' : summary?.avg_recovery_days != null ? String(summary.avg_recovery_days) : '—'}
        />
      </section>

      <section className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-sm font-semibold">Recovery trend by month</h2>
        <p className="mt-1 text-xs text-slate-500">Average treatment effectiveness score, tracked over time.</p>

        {chartData.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
            <p className="text-sm text-slate-500">No treatment outcomes recorded yet.</p>
          </div>
        ) : (
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const numeric = typeof value === 'number' ? value : Number(value);
                    if (Number.isNaN(numeric)) return ['—', String(name)];
                    return name === 'effectiveness' ? [`${numeric}%`, 'Avg effectiveness'] : [String(numeric), 'Cases'];
                  }}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="effectiveness"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#0f172a' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2.5 font-medium">Month</th>
                  <th className="px-4 py-2.5 font-medium">Avg effectiveness</th>
                  <th className="px-4 py-2.5 font-medium">Cases</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((t) => (
                  <tr key={t.month} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-2.5 font-[family-name:var(--font-mono)] text-xs">{t.month}</td>
                    <td className="px-4 py-2.5">{t.avg_effectiveness != null ? `${(t.avg_effectiveness * 100).toFixed(1)}%` : '—'}</td>
                    <td className="px-4 py-2.5">{t.case_count}</td>
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