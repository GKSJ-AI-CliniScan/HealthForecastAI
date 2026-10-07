'use client';

import Link from 'next/link';
import { KpiCard } from '@/components/ui/KpiCard';
import { ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/lib/auth';
import { RateBarChart } from '@/components/charts/RateBarChart';
import {
  ROLE_LABELS,
  type DashboardSummary,
  type RecoveryTrendPoint,
  type TreatmentEffectivenessSummary,
} from '@/types';

export default function DashboardPage() {
  const { user, can } = useAuth();
  const { data, error, loading } = useApi<DashboardSummary>('/analytics/dashboard');
  const treatmentSummary = useApi<TreatmentEffectivenessSummary[]>(
    user?.role === 'system_admin' ? null : '/treatment',
  );
  const recoveryTrend = useApi<RecoveryTrendPoint[]>(
    user?.role === 'system_admin' ? null : '/treatment/recovery-trends',
  );

  if (loading) return <Loading />;
  if (error) return <ErrorBlock message={error} />;
  if (!data || !user) return null;

  const roleContent = {
    doctor: {
      eyebrow: 'Clinical workspace',
      title: `Good morning, ${user.full_name}`,
      description: 'Review your assigned patients, prioritize readmission risk, and coordinate treatment follow-up.',
      accent: 'border-l-blue-600',
      links: [
        { href: '/patients', label: 'Assigned patients', detail: 'Records & care plans', visible: can('patient:read_assigned') || can('patient:read_all') },
        { href: '/risk', label: 'Risk review', detail: '30-day forecast', visible: can('risk_report:read') },
        { href: '/treatment', label: 'Treatment outcomes', detail: 'Regimens & recovery', visible: can('treatment_report:read') },
      ],
    },
    hospital_admin: {
      eyebrow: 'Operations command center',
      title: 'Hospital performance overview',
      description: 'Monitor quality, capacity, treatment effectiveness, and financial risk across the hospital.',
      accent: 'border-l-emerald-600',
      links: [
        { href: '/analytics', label: 'Quality dashboard', detail: 'Performance & trends', visible: can('hospital_analytics:read') },
        { href: '/treatment', label: 'Treatment effectiveness', detail: 'Recovery & savings', visible: can('treatment_report:read') },
        { href: '/risk', label: 'Population risk', detail: 'High-risk cohorts', visible: can('risk_report:read') },
      ],
    },
    researcher: {
      eyebrow: 'Population health workspace',
      title: 'Research and outcomes overview',
      description: 'Explore de-identified cohorts, clinical outcomes, and longitudinal healthcare trends.',
      accent: 'border-l-violet-600',
      links: [
        { href: '/research', label: 'Research cohort', detail: 'De-identified records', visible: can('population_health:read') },
        { href: '/analytics', label: 'Healthcare analytics', detail: 'Aggregated trends', visible: can('hospital_analytics:read') },
        { href: '/treatment', label: 'Treatment outcomes', detail: 'Effectiveness analysis', visible: can('treatment_report:read') },
      ],
    },
    system_admin: {
      eyebrow: 'Platform administration',
      title: 'HealthForecast platform status',
      description: 'Maintain model operations, access controls, auditability, and hospital intelligence services.',
      accent: 'border-l-slate-700',
      links: [
        { href: '/model-training', label: 'Model operations', detail: 'Training & promotion', visible: can('model:manage') },
        { href: '/users', label: 'Access control', detail: 'Users & permissions', visible: can('user:manage') },
        { href: '/analytics', label: 'System analytics', detail: 'Quality & trends', visible: can('hospital_analytics:read') },
      ],
    },
  }[user.role];

  const scopeLabel =
    data.scope === 'caseload' ? 'Your assigned caseload' : 'Hospital wide';

  const dashboardMetrics = {
    doctor: [
      ['Assigned patients', data.total_patients.toLocaleString(), 'Active patients in your caseload'],
      ['Open admissions', data.total_admissions.toLocaleString(), 'Encounters requiring review'],
      ['Readmissions to review', data.readmissions_within_30_days.toLocaleString(), 'Returned within 30 days'],
      ['Caseload readmission rate', `${(data.readmission_rate * 100).toFixed(2)}%`, `Average stay ${data.average_length_of_stay} days`],
    ],
    hospital_admin: [
      ['Hospital patients', data.total_patients.toLocaleString(), 'Current hospital record'],
      ['Inpatient encounters', data.total_admissions.toLocaleString(), 'Reporting period volume'],
      ['Quality events', data.readmissions_within_30_days.toLocaleString(), '30-day readmissions'],
      ['Hospital readmission rate', `${(data.readmission_rate * 100).toFixed(2)}%`, `ALOS ${data.average_length_of_stay} days`],
    ],
    researcher: [
      ['Research population', data.total_patients.toLocaleString(), 'Aggregated subjects'],
      ['Observed encounters', data.total_admissions.toLocaleString(), 'De-identified event volume'],
      ['Outcome events', data.readmissions_within_30_days.toLocaleString(), '30-day outcome events'],
      ['Population rate', `${(data.readmission_rate * 100).toFixed(2)}%`, 'Aggregated readmission signal'],
    ],
    system_admin: [
      ['Tracked records', data.total_patients.toLocaleString(), 'Platform data volume'],
      ['Data events', data.total_admissions.toLocaleString(), 'Inpatient event volume'],
      ['Monitored outcomes', data.readmissions_within_30_days.toLocaleString(), '30-day outcome events'],
      ['Service rate', `${(data.readmission_rate * 100).toFixed(2)}%`, `Average stay ${data.average_length_of_stay} days`],
    ],
  }[user.role];
  const metricTones: Array<'default' | 'warn' | 'good'> = [
    'default',
    'default',
    'warn',
    data.readmission_rate > 0.12 ? 'warn' : 'good',
  ];
  const treatmentSectionTitle = {
    doctor: 'Patient recovery at a glance',
    hospital_admin: 'Hospital treatment outcomes',
    researcher: 'Population outcomes at a glance',
    system_admin: 'Platform outcomes',
  }[user.role];

  return (
    <div className="space-y-8">
      <header className={`rounded-2xl border-l-4 bg-[var(--surface)] px-6 py-5 shadow-sm ${roleContent.accent}`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          {roleContent.eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{roleContent.title}</h1>
        <p className="muted mt-2 max-w-2xl text-sm">{roleContent.description}</p>
        <p className="muted mt-3 text-xs">Data scope: {scopeLabel}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardMetrics.map(([label, value, hint], index) => (
          <KpiCard
            key={label}
            label={label}
            value={value}
            hint={hint}
            tone={metricTones[index]}
          />
        ))}
      </section>

      {user.role !== 'system_admin' && (
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="muted text-xs font-semibold uppercase tracking-widest">Milestone 3</p>
            <h2 className="mt-1 text-lg font-semibold">
              {treatmentSectionTitle}
            </h2>
            <p className="muted mt-1 text-sm">
              Recovery progress and regimen effectiveness for the current reporting cohort.
            </p>
          </div>
          <Link href="/treatment?tab=reports" className="btn-ghost text-xs">
            Open effectiveness reports <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Recovery trajectory</h3>
                <p className="muted mt-1 text-xs">Average score by post-discharge week</p>
              </div>
              <Link href="/treatment?tab=trajectory" className="muted text-xs font-medium hover:underline">
                View detail
              </Link>
            </div>
            {recoveryTrend.data ? (
              <RateBarChart
                data={recoveryTrend.data as unknown as Record<string, unknown>[]}
                xKey="week"
                yKey="average_recovery_score"
                height={220}
                barColor="#0f9d58"
              />
            ) : (
              <p className="muted py-12 text-center text-sm">Recovery data is not available.</p>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Leading protocols</h3>
                <p className="muted mt-1 text-xs">Highest recovery scores in the active cohort</p>
              </div>
              <Link href="/treatment?tab=matrix" className="muted text-xs font-medium hover:underline">
                Compare all
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {(treatmentSummary.data ?? []).slice(0, 3).map((treatment) => (
                <div key={treatment.treatment_name}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{treatment.treatment_name}</span>
                    <span className="shrink-0 font-semibold text-emerald-600">
                      {treatment.average_recovery_score.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, treatment.average_recovery_score)}%` }}
                    />
                  </div>
                  <p className="muted mt-1 text-xs">
                    {(treatment.readmission_rate * 100).toFixed(1)}% 30-day readmission rate
                  </p>
                </div>
              ))}
              {!treatmentSummary.data?.length && (
                <p className="muted py-8 text-center text-sm">Treatment outcomes are not available.</p>
              )}
            </div>
          </div>
        </div>
      </section>
      )}

      <section className="card">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="muted text-xs font-semibold uppercase tracking-widest">Your tools</p>
            <h2 className="mt-1 text-lg font-semibold">Role-specific workspaces</h2>
          </div>
          <span className="muted text-xs">{ROLE_LABELS[user.role]}</span>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roleContent.links.filter((link) => link.visible).map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="btn-ghost w-full justify-between">
                <span>{link.label}</span>
                <span className="muted text-xs">{link.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="muted text-xs">
        HealthForecast AI integrates real-time risk stratification, treatment efficacy analysis, and hospital trend monitoring.
      </p>

    </div>
  );
}
