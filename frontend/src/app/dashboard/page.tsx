'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { MetricCard } from '@/components/ui/MetricCard';
import { PatientTable } from '@/components/ui/PatientTable';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { patients as patientsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { DashboardStats, Patient } from '@/types';

/**
 * Milestone 1 dashboard.
 *
 * Every number on this screen comes from the API. There is deliberately no mock
 * fallback: a dashboard that quietly renders invented figures when the backend
 * is down looks identical to a working one, which is how a broken integration
 * survives a demo unnoticed.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { token, user, logout, can } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rows, setRows] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isResearcher = can('patient:read_anonymized') && !can('patient:read_all');

  const load = useCallback(async () => {
    if (token === null) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Researchers hold no identified-read permission, so they are sent to the
      // de-identified cohort endpoint instead of the patient list.
      const [statsResult, patientResult] = await Promise.all([
        patientsApi.stats(token),
        isResearcher ? patientsApi.anonymised(token) : patientsApi.list(token),
      ]);
      setStats(statsResult);
      setRows(patientResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [token, isResearcher]);

  useEffect(() => {
    if (token === null) {
      router.replace('/login');
      return;
    }
    void load();
  }, [token, load, router]);

  if (token === null || user === null) {
    return null;
  }

  const scopeLabel =
    stats?.scope === 'assigned' ? 'Your assigned patients' : 'Hospital wide';

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">HealthForecast AI</h1>
            <p className="text-sm text-slate-500">{user.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <RoleBadge role={user.role} />
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700
                         transition hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-slate-900">Overview</h2>
            <p className="text-sm text-slate-500">{scopeLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700
                       transition hover:bg-slate-100"
          >
            Refresh
          </button>
        </div>

        {error !== null && (
          <div role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">Could not reach the API</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2 text-red-600">
              Check that the backend is running on port 8000, then press Refresh.
            </p>
          </div>
        )}

        {loading && error === null && (
          <p className="mt-6 text-sm text-slate-500">Loading...</p>
        )}

        {stats !== null && !loading && (
          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Patients" value={stats.total_patients.toLocaleString()} />
            <MetricCard label="Admissions" value={stats.total_admissions.toLocaleString()} />
            <MetricCard
              label="Readmitted within 30 days"
              value={stats.readmitted_within_30_days.toLocaleString()}
              caption={`${stats.readmission_rate_percent}% of admissions`}
            />
            <MetricCard
              label="Average stay"
              value={`${stats.average_length_of_stay_days} days`}
            />
          </section>
        )}

        {!loading && error === null && (
          <section className="mt-8">
            <h3 className="text-base font-medium text-slate-900">
              {isResearcher ? 'De-identified cohort' : 'Patients'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {isResearcher
                ? 'Direct identifiers are removed before this data leaves the server.'
                : 'Rows are limited to what your role is permitted to see.'}
            </p>
            <div className="mt-4">
              <PatientTable rows={rows} anonymised={isResearcher} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
