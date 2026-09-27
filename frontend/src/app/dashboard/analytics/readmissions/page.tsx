import MonthsFilter, { MONTH_CHOICES } from '@/components/analytics/MonthsFilter';
import CategoryBarChart from '@/components/charts/CategoryBarChart';
import TrendLineChart from '@/components/charts/TrendLineChart';
import { StatTile } from '@/components/ui';
import { LoadedCard, NoAccess, SectionError } from '@/components/ui/states';
import { apiFetch } from '@/lib/api';
import { load } from '@/lib/errors';
import { formatNumber, formatPercent } from '@/lib/format';
import { pickChoice, type SearchParams } from '@/lib/params';
import { can, getToken, requireUser } from '@/lib/session';
import type { HospitalAnalyticsSummary, ReadmissionTrendPoint } from '@/types';

export const dynamic = 'force-dynamic';

/** Readmission Analytics Dashboard (FR-ANL-01). */
export default async function ReadmissionAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  if (!can(user, 'hospital_analytics:read')) {
    return <NoAccess what="readmission analytics" />;
  }
  const token = await getToken();
  const months = pickChoice(await searchParams, 'months', MONTH_CHOICES, 12);
  const options = { cache: 'no-store' } as const;

  const [summary, trend] = await Promise.all([
    load(() => apiFetch<HospitalAnalyticsSummary>('/analytics/summary', options, token)),
    load(() =>
      apiFetch<ReadmissionTrendPoint[]>(`/analytics/readmissions?months=${months}`, options, token),
    ),
  ]);

  return (
    <div className="space-y-6">
      {summary.ok ? (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatTile label="Patients" value={formatNumber(summary.data.total_patients)} />
          <StatTile label="Admissions" value={formatNumber(summary.data.total_admissions)} />
          <StatTile label="Readmission rate" value={formatPercent(summary.data.readmission_rate)} />
          <StatTile
            label="Avg length of stay"
            value={`${formatNumber(summary.data.average_length_of_stay, 1)} days`}
          />
        </div>
      ) : (
        <SectionError error={summary.error} />
      )}

      <LoadedCard
        title="Readmission rate by admission month"
        result={trend}
        isEmpty={(rows) => rows.length === 0}
        empty="No admissions with an admission date have been recorded yet."
        actions={<MonthsFilter months={months} />}
      >
        {(rows) => (
          <div className="grid gap-6 lg:grid-cols-2">
            <TrendLineChart
              label="Monthly readmission rate"
              data={rows.map((row) => ({ month: row.month, rate: row.readmission_rate }))}
              xKey="month"
              series={[{ key: 'rate', label: 'Readmission rate' }]}
              valueFormat="percent"
            />
            <CategoryBarChart
              label="Admissions per month"
              data={rows.map((row) => ({ name: row.month, value: row.total_admissions }))}
              color="#06b6d4"
            />
          </div>
        )}
      </LoadedCard>
    </div>
  );
}
