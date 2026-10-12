import CategoryBarChart from '@/components/charts/CategoryBarChart';
import { MetricStrip, StatTile } from '@/components/ui';
import { LoadedCard, NoAccess } from '@/components/ui/states';
import { apiFetch } from '@/lib/api';
import { load } from '@/lib/errors';
import { formatNumber, toCountRows } from '@/lib/format';
import { can, getToken, requireUser } from '@/lib/session';
import type { PopulationHealthSummary } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Population Health Dashboard - aggregated counts only. The backend refuses
 * (422) when the hospital is too small for aggregates to be safe; that is
 * explained rather than shown as an error to retry.
 */
export default async function PopulationHealthPage() {
  const user = await requireUser();
  if (!can(user, 'population_health:read')) {
    return <NoAccess what="population health statistics" />;
  }
  const token = await getToken();
  const population = await load(() =>
    apiFetch<PopulationHealthSummary>('/analytics/population-health', { cache: 'no-store' }, token),
  );

  return (
    <LoadedCard
      title="Population health"
      result={population}
      isEmpty={(data) => data.total_patients === 0}
      empty="No patients recorded yet."
    >
      {(data) => (
        <div className="space-y-6">
          <MetricStrip label="Population summary">
            <StatTile variant="plain" label="Patients" value={formatNumber(data.total_patients)} />
            <StatTile variant="plain"
              label="Diagnoses listed"
              value={formatNumber(Object.keys(data.disease_prevalence).length)}
            />
            <StatTile variant="plain"
              label="Age bands"
              value={formatNumber(Object.keys(data.demographic_distribution.age_group).length)}
            />
          </MetricStrip>
          <div>
            <h3 className="mb-3 text-panel text-ink">Most common primary diagnoses</h3>
            <CategoryBarChart
              label="Disease prevalence"
              data={toCountRows(data.disease_prevalence)}
              horizontal
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="mb-3 text-panel text-ink">Age band</h3>
              <CategoryBarChart
                label="Patients by age band"
                data={toCountRows(data.demographic_distribution.age_group).sort((a, b) =>
                  a.name.localeCompare(b.name, undefined, { numeric: true }),
                )}
              />
            </div>
            <div>
              <h3 className="mb-3 text-panel text-ink">Gender</h3>
              <CategoryBarChart
                label="Patients by gender"
                data={toCountRows(data.demographic_distribution.gender)}
              />
            </div>
            <div>
              <h3 className="mb-3 text-panel text-ink">Race</h3>
              <CategoryBarChart
                label="Patients by race"
                data={toCountRows(data.demographic_distribution.race)}
                horizontal
              />
            </div>
          </div>
        </div>
      )}
    </LoadedCard>
  );
}
