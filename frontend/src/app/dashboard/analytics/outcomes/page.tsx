import MonthsFilter, { MONTH_CHOICES } from '@/components/analytics/MonthsFilter';
import CategoryBarChart from '@/components/charts/CategoryBarChart';
import MultiBarChart from '@/components/charts/MultiBarChart';
import { LoadedCard, NoAccess } from '@/components/ui/states';
import { apiFetch } from '@/lib/api';
import { load } from '@/lib/errors';
import { toCountRows } from '@/lib/format';
import { pickChoice, type SearchParams } from '@/lib/params';
import { can, getToken, requireUser } from '@/lib/session';
import type { DischargeOutcomeDistribution, TrendPoint } from '@/types';

export const dynamic = 'force-dynamic';

const OUTCOME_SERIES = [
  { key: 'improved', label: 'Improved' },
  { key: 'unchanged', label: 'Unchanged' },
  { key: 'worsened', label: 'Worsened' },
  { key: 'unknown', label: 'Unknown' },
  { key: 'unrecorded', label: 'Not recorded' },
];

/** Patient Outcome Analytics (FR-ANL-02/03): outcome trend and discharge outcomes. */
export default async function OutcomeAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  if (!can(user, 'hospital_analytics:read')) {
    return <NoAccess what="patient outcome analytics" />;
  }
  const token = await getToken();
  const months = pickChoice(await searchParams, 'months', MONTH_CHOICES, 12);
  const options = { cache: 'no-store' } as const;

  const [trend, discharges] = await Promise.all([
    load(() =>
      apiFetch<TrendPoint[]>(`/analytics/trends?metric=outcome&months=${months}`, options, token),
    ),
    load(() =>
      apiFetch<DischargeOutcomeDistribution>('/analytics/discharge-outcomes', options, token),
    ),
  ]);

  return (
    <div className="space-y-6">
      <LoadedCard
        title="Treatment outcomes by discharge month"
        result={trend}
        isEmpty={(rows) => rows.length === 0}
        empty="No treatment outcomes with a discharge date have been recorded yet."
        actions={<MonthsFilter months={months} />}
      >
        {(rows) => (
          <MultiBarChart
            label="Monthly treatment outcome breakdown"
            data={rows.map((row) => ({ period: row.period, ...row.breakdown }))}
            xKey="period"
            series={OUTCOME_SERIES.filter((series) =>
              rows.some((row) => (row.breakdown[series.key] ?? 0) > 0),
            )}
            stacked
          />
        )}
      </LoadedCard>

      <LoadedCard
        title="Discharge outcomes"
        result={discharges}
        isEmpty={(data) => Object.keys(data.distribution).length === 0}
        empty="No admissions recorded yet."
      >
        {(data) => (
          <CategoryBarChart
            label="Admissions by discharge disposition"
            data={toCountRows(data.distribution)}
            horizontal
          />
        )}
      </LoadedCard>
    </div>
  );
}
