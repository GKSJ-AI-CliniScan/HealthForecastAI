'use client';

import { RateBarChart } from '@/components/charts/RateBarChart';
import { KpiCard } from '@/components/ui/KpiCard';
import { ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import type {
  AdmissionTypeStat,
  AgeBandStat,
  DashboardSummary,
  LengthOfStayBucket,
} from '@/types';

export default function AnalyticsPage() {
  const summary = useApi<DashboardSummary>('/analytics/summary');
  const byAge = useApi<AgeBandStat[]>('/analytics/readmissions/by-age');
  const byType = useApi<AdmissionTypeStat[]>('/analytics/readmissions/by-admission-type');
  const stays = useApi<LengthOfStayBucket[]>('/analytics/length-of-stay');

  const error = summary.error ?? byAge.error ?? byType.error ?? stays.error;
  const loading = summary.loading || byAge.loading || byType.loading || stays.loading;

  if (error) return <ErrorBlock message={error} />;
  if (loading) return <Loading />;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Healthcare analytics</h1>
        <p className="muted mt-1 text-sm">
          Hospital performance and readmission breakdowns across the loaded record.
        </p>
      </header>

      {summary.data ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Patients" value={summary.data.total_patients.toLocaleString()} />
          <KpiCard
            label="Admissions"
            value={summary.data.total_admissions.toLocaleString()}
          />
          <KpiCard
            label="30-day readmissions"
            value={summary.data.readmissions_within_30_days.toLocaleString()}
            tone="warn"
          />
          <KpiCard
            label="Average stay"
            value={`${summary.data.average_length_of_stay} days`}
          />
        </section>
      ) : null}

      <section className="card">
        <h2 className="text-lg font-semibold">Readmission rate by age band</h2>
        <p className="muted mb-4 mt-1 text-sm">
          Readmission risk rises steadily with age - the clearest single signal in this
          dataset.
        </p>
        {byAge.data ? (
          <RateBarChart
            data={byAge.data as unknown as Record<string, unknown>[]}
            xKey="age_group"
            yKey="readmission_rate"
            asPercent
          />
        ) : null}
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Readmission rate by admission type</h2>
        <p className="muted mb-4 mt-1 text-sm">
          How the patient arrived, and how often they came back within 30 days.
        </p>
        {byType.data ? (
          <RateBarChart
            data={byType.data as unknown as Record<string, unknown>[]}
            xKey="admission_type"
            yKey="readmission_rate"
            asPercent
          />
        ) : null}
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Length of stay distribution</h2>
        <p className="muted mb-4 mt-1 text-sm">
          Admissions by number of days in hospital.
        </p>
        {stays.data ? (
          <RateBarChart
            data={stays.data as unknown as Record<string, unknown>[]}
            xKey="days"
            yKey="admissions"
          />
        ) : null}
      </section>

      {byType.data ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Admission types in detail</h2>
          <div className="table-wrap">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">Admission type</th>
                  <th className="th">Admissions</th>
                  <th className="th">30-day readmissions</th>
                  <th className="th">Rate</th>
                </tr>
              </thead>
              <tbody>
                {byType.data.map((row) => (
                  <tr key={row.admission_type}>
                    <td className="td font-medium">{row.admission_type}</td>
                    <td className="td">{row.admissions.toLocaleString()}</td>
                    <td className="td">{row.readmissions.toLocaleString()}</td>
                    <td className="td">{(row.readmission_rate * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
