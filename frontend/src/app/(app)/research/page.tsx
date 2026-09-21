'use client';

import { useState } from 'react';
import { RateBarChart } from '@/components/charts/RateBarChart';
import { KpiCard } from '@/components/ui/KpiCard';
import { ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import type { AnonymisedPatient, Page, PopulationHealth } from '@/types';

const PAGE_SIZE = 25;

export default function ResearchPage() {
  const [offset, setOffset] = useState(0);
  const overview = useApi<PopulationHealth>('/analytics/population-health');
  const cohort = useApi<Page<AnonymisedPatient>>(
    `/patients/anonymised?limit=${PAGE_SIZE}&offset=${offset}`,
  );

  const error = overview.error ?? cohort.error;
  if (error) return <ErrorBlock message={error} />;
  if (overview.loading) return <Loading />;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Research cohort</h1>
        <p className="muted mt-1 text-sm">
          De-identified records only. Medical record numbers are replaced by salted,
          non-reversible pseudonyms that stay stable between queries.
        </p>
      </header>

      {overview.data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Cohort size"
              value={overview.data.cohort_size.toLocaleString()}
              hint="Distinct subjects"
            />
            <KpiCard label="Gender groups" value={overview.data.by_gender.length} />
            <KpiCard label="Age bands" value={overview.data.by_age_group.length} />
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold">Readmission rate by age band</h2>
            <p className="muted mb-4 mt-1 text-sm">Aggregated values only.</p>
            <RateBarChart
              data={overview.data.by_age_group as unknown as Record<string, unknown>[]}
              xKey="age_group"
              yKey="readmission_rate"
              asPercent
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="text-lg font-semibold">By gender</h2>
              <div className="table-wrap mt-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="th">Gender</th>
                      <th className="th">Patients</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.data.by_gender.map((row) => (
                      <tr key={row.gender}>
                        <td className="td">{row.gender}</td>
                        <td className="td">{row.patients.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold">By recorded race</h2>
              <div className="table-wrap mt-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="th">Group</th>
                      <th className="th">Patients</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.data.by_race.map((row) => (
                      <tr key={row.race}>
                        <td className="td">{row.race}</td>
                        <td className="td">{row.patients.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Anonymised records</h2>
        {cohort.loading ? <Loading /> : null}
        {cohort.data ? (
          <>
            <div className="table-wrap">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="th">Pseudo ID</th>
                    <th className="th">Age band</th>
                    <th className="th">Gender</th>
                    <th className="th">Primary diagnosis</th>
                  </tr>
                </thead>
                <tbody>
                  {cohort.data.items.map((row) => (
                    <tr key={row.pseudo_id}>
                      <td className="td font-mono text-xs">{row.pseudo_id}</td>
                      <td className="td">{row.age_group ?? '—'}</td>
                      <td className="td">{row.gender ?? '—'}</td>
                      <td className="td">{row.primary_diagnosis ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="muted text-sm">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, cohort.data.total)} of{' '}
                {cohort.data.total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={offset + PAGE_SIZE >= cohort.data.total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
