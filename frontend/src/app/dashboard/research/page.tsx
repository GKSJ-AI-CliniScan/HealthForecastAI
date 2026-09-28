'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { AnonymisedPatient } from '@/types';

const CATEGORY_STYLES: Record<string, string> = {
  low: 'bg-risk-low/10 text-risk-low',
  medium: 'bg-risk-medium/15 text-yellow-700',
  high: 'bg-risk-high/10 text-risk-high',
  not_scored: 'bg-slate-100 text-slate-500',
};

export default function ResearchCohortPage() {
  const { token } = useAuth();
  const [cohort, setCohort] = useState<AnonymisedPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<AnonymisedPatient[]>('/patients/anonymised', {}, token)
      .then(setCohort)
      .catch(() => setError('Could not load the research cohort. This view requires the researcher role.'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const counts = { low: 0, medium: 0, high: 0, not_scored: 0 };
  for (const p of cohort) counts[p.risk_category as keyof typeof counts] = (counts[p.risk_category as keyof typeof counts] ?? 0) + 1;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Research</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">De-identified patient cohort</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-500">
        Aggregated, anonymised patient data for research purposes. No names, medical record numbers, or assigned doctors are exposed.
      </p>

      {error && <p className="mt-4 text-sm text-risk-high">{error}</p>}

      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        <StatCard label="Cohort size" value={isLoading ? '—' : String(cohort.length)} />
        <StatCard label="High risk" value={String(counts.high)} accent="text-risk-high" />
        <StatCard label="Medium risk" value={String(counts.medium)} accent="text-yellow-700" />
        <StatCard label="Low risk" value={String(counts.low)} accent="text-risk-low" />
      </section>

      <section className="mt-8 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Pseudo ID</th>
              <th className="px-4 py-3 font-medium">Age group</th>
              <th className="px-4 py-3 font-medium">Gender</th>
              <th className="px-4 py-3 font-medium">Diagnosis</th>
              <th className="px-4 py-3 font-medium">Risk category</th>
            </tr>
          </thead>
          <tbody>
            {cohort.map((p) => (
              <tr key={p.pseudo_id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs">{p.pseudo_id}</td>
                <td className="px-4 py-3">{p.age_group ?? '—'}</td>
                <td className="px-4 py-3">{p.gender ?? '—'}</td>
                <td className="px-4 py-3">{p.primary_diagnosis ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${CATEGORY_STYLES[p.risk_category] ?? ''}`}>
                    {p.risk_category.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && cohort.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">No cohort data available.</p>
        )}
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