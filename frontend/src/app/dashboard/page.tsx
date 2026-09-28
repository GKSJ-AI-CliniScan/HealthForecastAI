'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { Patient } from '@/types';

export default function OverviewPage() {
  const { token, role, permissions } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isResearcher = role === 'researcher';

  useEffect(() => {
    if (!token) return;
    if (isResearcher) {
      setIsLoading(false);
      return;
    }
    apiFetch<Patient[]>('/patients', {}, token)
      .then(setPatients)
      .catch(() => setError('Could not load patients for this role.'))
      .finally(() => setIsLoading(false));
  }, [token, isResearcher]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Overview</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Healthcare dashboard</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-500">
        Monitor patients and access clinical risk analytics available to your role.
      </p>

      {permissions.includes('patient:read_assigned') && !permissions.includes('patient:read_all') && (
        <p className="mt-2 text-sm text-slate-500">Showing patients currently assigned to you.</p>
      )}
      {permissions.includes('patient:read_all') && (
        <p className="mt-2 text-sm text-slate-500">Showing all patients across the hospital.</p>
      )}
      {isResearcher && (
        <p className="mt-2 text-sm text-slate-500">
          Your role views de-identified data only —{' '}
          <Link href="/dashboard/research" className="underline">go to Research Cohort</Link>.
        </p>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Visible patients" value={isResearcher ? '—' : isLoading ? '—' : String(patients.length)} />
        <StatCard label="Current role" value={role?.replace('_', ' ') ?? '—'} capitalize />
        <StatCard label="Permissions" value={String(permissions.length)} />
      </section>

      {error && <p className="mt-6 text-sm text-risk-high">{error}</p>}

      {permissions.includes('risk_report:read') && (
        <section className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Risk prediction</h2>
              <p className="mt-1 text-sm text-slate-500">
                Readmission risk, high-risk patient identification, and clinical model explanations.
              </p>
            </div>
            <Link
              href="/dashboard/risk"
              className="shrink-0 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open risk dashboard
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <ModuleTile title="Patient risk scoring" body="Calculate an estimated readmission probability from admission features." />
            <ModuleTile title="High-risk monitoring" body="Review patients whose latest model prediction falls in the high-risk band." />
            <ModuleTile title="Model explanation" body="Review the factors that contributed most strongly to an individual prediction." />
          </div>
        </section>
      )}

      {!isResearcher && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-slate-500">
            Patients {!isLoading && <span className="text-slate-400">· {patients.length} records</span>}
          </h2>

          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Medical record number</th>
                  <th className="px-4 py-3 font-medium">Age group</th>
                  <th className="px-4 py-3 font-medium">Gender</th>
                  <th className="px-4 py-3 font-medium">Primary diagnosis</th>
                  <th className="px-4 py-3 font-medium">Doctor</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs">{p.medical_record_number}</td>
                    <td className="px-4 py-3">{p.age_group ?? '—'}</td>
                    <td className="px-4 py-3">{p.gender ?? '—'}</td>
                    <td className="px-4 py-3">{p.primary_diagnosis ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.assigned_doctor_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && patients.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">No patients visible to this role yet.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${capitalize ? 'capitalize' : 'font-[family-name:var(--font-mono)]'}`}>{value}</p>
    </div>
  );
}

function ModuleTile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{body}</p>
    </div>
  );
}