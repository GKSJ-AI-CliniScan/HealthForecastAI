import MonthsFilter, { MONTH_CHOICES } from '@/components/analytics/MonthsFilter';
import CategoryBarChart from '@/components/charts/CategoryBarChart';
import MultiBarChart from '@/components/charts/MultiBarChart';
import { StatTile } from '@/components/ui';
import { LoadedCard, NoAccess } from '@/components/ui/states';
import { apiFetch } from '@/lib/api';
import { load } from '@/lib/errors';
import { formatNumber } from '@/lib/format';
import { pickChoice, type SearchParams } from '@/lib/params';
import { can, getToken, requireUser } from '@/lib/session';
import type { HospitalAnalyticsSummary, RiskCategory, TrendPoint } from '@/types';

export const dynamic = 'force-dynamic';

const CATEGORIES: RiskCategory[] = ['low', 'medium', 'high'];
const CATEGORY_LABELS: Record<RiskCategory, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/** Risk Distribution Dashboard: latest category per patient, and scoring over time. */
export default async function RiskDistributionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  if (!can(user, 'hospital_analytics:read')) {
    return <NoAccess what="risk distribution analytics" />;
  }
  const token = await getToken();
  const months = pickChoice(await searchParams, 'months', MONTH_CHOICES, 12);
  const options = { cache: 'no-store' } as const;

  const [summary, trend] = await Promise.all([
    load(() => apiFetch<HospitalAnalyticsSummary>('/analytics/summary', options, token)),
    load(() =>
      apiFetch<TrendPoint[]>(`/analytics/trends?metric=risk&months=${months}`, options, token),
    ),
  ]);

  return (
    <div className="space-y-6">
      <LoadedCard
        title="Latest risk category per patient"
        result={summary}
        isEmpty={(data) => CATEGORIES.every((key) => data.risk_distribution[key] === 0)}
        empty="No patient has been risk-scored yet."
      >
        {(data) => (
          <div className="grid gap-6 lg:grid-cols-[auto,1fr]">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {CATEGORIES.map((key) => (
                <StatTile
                  key={key}
                  label={`${CATEGORY_LABELS[key]} risk`}
                  value={formatNumber(data.risk_distribution[key])}
                />
              ))}
            </div>
            <CategoryBarChart
              label="Patients per risk category"
              data={CATEGORIES.map((key) => ({ name: key, value: data.risk_distribution[key] }))}
            />
          </div>
        )}
      </LoadedCard>

      <LoadedCard
        title="Risk scores issued per month"
        result={trend}
        isEmpty={(rows) => rows.length === 0}
        empty="No risk scores have been issued yet."
        actions={<MonthsFilter months={months} />}
      >
        {(rows) => (
          <MultiBarChart
            label="Monthly risk scores by category"
            data={rows.map((row) => ({ period: row.period, ...row.breakdown }))}
            xKey="period"
            series={CATEGORIES.map((key) => ({ key, label: CATEGORY_LABELS[key] }))}
            stacked
          />
        )}
      </LoadedCard>
    </div>
  );
}
