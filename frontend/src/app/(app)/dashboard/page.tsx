'use client';

import Link from 'next/link';
import { KpiCard } from '@/components/ui/KpiCard';
import { ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS, type DashboardSummary } from '@/types';

export default function DashboardPage() {
  const { user, can } = useAuth();
  const { data, error, loading } = useApi<DashboardSummary>('/analytics/dashboard');

  if (loading) return <Loading />;
  if (error) return <ErrorBlock message={error} />;
  if (!data || !user) return null;

  const scopeLabel =
    data.scope === 'caseload' ? 'Your assigned caseload' : 'Hospital wide';

  return (
    <div className="space-y-8">
      <header>
        <p className="muted text-xs font-semibold uppercase tracking-widest">
          {ROLE_LABELS[user.role]}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Welcome back, {user.full_name}
        </h1>
        <p className="muted mt-1 text-sm">{scopeLabel}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Patients"
          value={data.total_patients.toLocaleString()}
          hint={data.scope === 'caseload' ? 'Assigned to you' : 'In the hospital record'}
        />
        <KpiCard
          label="Admissions"
          value={data.total_admissions.toLocaleString()}
          hint="Inpatient encounters"
        />
        <KpiCard
          label="30-day readmissions"
          value={data.readmissions_within_30_days.toLocaleString()}
          hint="Returned within 30 days"
          tone="warn"
        />
        <KpiCard
          label="Readmission rate"
          value={`${(data.readmission_rate * 100).toFixed(2)}%`}
          hint={`Average stay ${data.average_length_of_stay} days`}
          tone={data.readmission_rate > 0.12 ? 'warn' : 'default'}
        />
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Where to go next</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {(can('patient:read_assigned') || can('patient:read_all')) && (
            <li>
              <Link href="/patients" className="btn-ghost w-full justify-between">
                <span>Patient records</span>
                <span className="muted text-xs">Review and manage</span>
              </Link>
            </li>
          )}
          {can('hospital_analytics:read') && (
            <li>
              <Link href="/analytics" className="btn-ghost w-full justify-between">
                <span>Healthcare analytics</span>
                <span className="muted text-xs">Readmission breakdowns</span>
              </Link>
            </li>
          )}
          {can('population_health:read') && (
            <li>
              <Link href="/research" className="btn-ghost w-full justify-between">
                <span>Research cohort</span>
                <span className="muted text-xs">Anonymised records</span>
              </Link>
            </li>
          )}
          {can('user:manage') && (
            <li>
              <Link href="/users" className="btn-ghost w-full justify-between">
                <span>User management</span>
                <span className="muted text-xs">Accounts and roles</span>
              </Link>
            </li>
          )}
        </ul>
      </section>

      <p className="muted text-xs">
        Risk prediction and readmission forecasting arrive in Milestone 2. This dashboard
        reports what the loaded record actually contains.
      </p>
    </div>
  );
}
