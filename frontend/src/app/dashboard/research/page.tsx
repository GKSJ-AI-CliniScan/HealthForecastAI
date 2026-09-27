import CategoryBarChart from '@/components/charts/CategoryBarChart';
import AnonymisedCohortTable, {
  COHORT_PAGE_SIZE,
} from '@/components/research/AnonymisedCohortTable';
import CohortFilterForm, { readCohortFilters } from '@/components/research/CohortFilterForm';
import { Card, StatTile } from '@/components/ui';
import DownloadButton from '@/components/ui/DownloadButton';
import { LoadedCard, NoAccess } from '@/components/ui/states';
import { apiFetch, apiFetchPage } from '@/lib/api';
import { load } from '@/lib/errors';
import { formatNumber, toCountRows } from '@/lib/format';
import { pickPage, pickString, toQuery, type SearchParams } from '@/lib/params';
import { can, getToken, requireUser } from '@/lib/session';
import type { AnonymisedPatient, CohortStatistics } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Research Analytics: cohort statistics, an anonymised cohort preview and the
 * CSV export - each shown only to a role holding its permission. Every value
 * comes from the backend's anonymised or aggregated endpoints; nothing here
 * can reach an identifiable record.
 */
export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const canStats = can(user, 'population_health:read');
  const canBrowse = can(user, 'patient:read_anonymized');
  const canExport = can(user, 'research_dataset:export');
  if (!canStats && !canBrowse && !canExport) {
    return <NoAccess what="research analytics" />;
  }

  const token = await getToken();
  const params = await searchParams;
  const filters = readCohortFilters((key) => pickString(params, key));
  const page = pickPage(params);
  const filterQuery = toQuery({ ...filters });
  const options = { cache: 'no-store' } as const;

  const [stats, cohort] = await Promise.all([
    canStats
      ? load(() =>
          apiFetch<CohortStatistics>(`/analytics/research-cohort${filterQuery}`, options, token),
        )
      : Promise.resolve(null),
    canBrowse
      ? load(() =>
          apiFetchPage<AnonymisedPatient>(
            `/patients/anonymised${toQuery({
              ...filters,
              limit: COHORT_PAGE_SIZE,
              offset: (page - 1) * COHORT_PAGE_SIZE,
            })}`,
            options,
            token,
          ),
        )
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Research analytics</h1>
        <p className="mt-1 text-sm opacity-70">
          Anonymised and aggregated data only. Patients are identified by pseudonym, ages are
          shown as 10-year bands, and any selection smaller than the minimum cohort size is
          refused.
        </p>
      </div>

      <Card title="Cohort filters">
        <CohortFilterForm filters={filters} />
      </Card>

      {stats && (
        <LoadedCard title="Cohort statistics" result={stats}>
          {(data) => (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatTile label="Cohort size" value={formatNumber(data.cohort_size)} />
                <StatTile
                  label="Age bands"
                  value={formatNumber(Object.keys(data.age_band_distribution).length)}
                />
                <StatTile
                  label="Diagnoses"
                  value={formatNumber(Object.keys(data.diagnosis_distribution).length)}
                />
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                <div>
                  <h3 className="mb-2 text-sm font-medium opacity-80">Age band</h3>
                  <CategoryBarChart
                    label="Cohort by age band"
                    data={toCountRows(data.age_band_distribution).sort((a, b) =>
                      a.name.localeCompare(b.name, undefined, { numeric: true }),
                    )}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium opacity-80">Gender</h3>
                  <CategoryBarChart
                    label="Cohort by gender"
                    data={toCountRows(data.gender_distribution)}
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium opacity-80">Diagnosis</h3>
                  <CategoryBarChart
                    label="Cohort by diagnosis"
                    data={toCountRows(data.diagnosis_distribution)}
                    horizontal
                  />
                </div>
              </div>
            </div>
          )}
        </LoadedCard>
      )}

      {canExport && (
        <Card title="Export anonymised dataset">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="opacity-70">
              Downloads the filtered cohort as CSV (pseudonymous id, age band, gender, primary
              diagnosis). The export is recorded in the audit log.
            </p>
            <DownloadButton
              href={`/api/research/export${filterQuery}`}
              label="Download CSV"
              fallbackName="research_cohort.csv"
            />
          </div>
        </Card>
      )}

      {cohort && (
        <LoadedCard
          title="Anonymised cohort"
          result={cohort}
          isEmpty={(data) => data.items.length === 0}
          empty="No patients on this page."
        >
          {(data) => (
            <AnonymisedCohortTable
              rows={data.items}
              total={data.total}
              page={page}
              filters={filters}
              basePath="/dashboard/research"
            />
          )}
        </LoadedCard>
      )}
    </div>
  );
}
