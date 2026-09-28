'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Patient, DischargePlan } from '@/types';

export default function ClinicalDecisionSupportPage() {
  const { token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string[] | null>(null);
  const [dischargePlan, setDischargePlan] = useState<DischargePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<Patient[]>('/patients', {}, token).then(setPatients).catch(() => {});
  }, [token]);

  async function handleLookup() {
  if (!token || !selectedId) return;
  setIsLoading(true);
  setError(null);
  try {
    const [recs, plan] = await Promise.all([
      apiFetch<string[]>(`/clinical-support/recommendations/${selectedId}`, {}, token),
      apiFetch<DischargePlan>(`/clinical-support/discharge-plan/${selectedId}`, {}, token),
    ]);
    setRecommendations(recs);
    setDischargePlan(plan);
  } catch {
    setError('Could not load recommendations for this patient.');
  } finally {
    setIsLoading(false);
  }
}

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Clinical Decision Support</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Care recommendations</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-500">
        Rule-based follow-up guidance derived from each patient&apos;s latest risk assessment.
      </p>

      <section className="mt-6 flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500">Select patient</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1.5 block w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          >
            <option value="">Select a patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.medical_record_number} — {p.primary_diagnosis ?? 'No diagnosis on file'}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleLookup}
          disabled={!selectedId || isLoading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isLoading ? 'Loading…' : 'Get recommendations'}
        </button>
      </section>

      {error && <p className="mt-4 text-sm text-risk-high">{error}</p>}

      {recommendations && (
  <section className="mt-8 grid gap-6 lg:grid-cols-3">
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-sm font-semibold">Patient</h2>
      {(() => {
        const p = patients.find((x) => String(x.id) === selectedId);
        return p ? (
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">MRN</dt><dd>{p.medical_record_number}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Diagnosis</dt><dd>{p.primary_diagnosis ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Age group</dt><dd>{p.age_group ?? '—'}</dd></div>
          </dl>
        ) : null;
      })()}
    </div>

    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-sm font-semibold">Care recommendations</h2>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {recommendations.map((r, i) => (
          <li key={i} className="flex gap-2"><span className="text-slate-400">•</span>{r}</li>
        ))}
      </ul>
    </div>

    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-sm font-semibold">Discharge plan</h2>
      {dischargePlan && (
        <p className="mt-4 text-sm">
          <span className="font-medium">Requires close monitoring: </span>
          {dischargePlan.requires_close_monitoring ? 'Yes' : 'No'}
        </p>
      )}
    </div>
  </section>
)}
    </div>
  );
}