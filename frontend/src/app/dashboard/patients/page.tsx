import Link from 'next/link';

import AnonymisedCohortTable, {
  COHORT_PAGE_SIZE,
} from '@/components/research/AnonymisedCohortTable';
import CohortFilterForm, { readCohortFilters } from '@/components/research/CohortFilterForm';
import { Card, Cell, Row, Table } from '@/components/ui';
import { LoadedCard, SectionError } from '@/components/ui/states';
import { apiFetch, apiFetchPage } from '@/lib/api';
import { load } from '@/lib/errors';
import { pickPage, pickString, toQuery, type SearchParams } from '@/lib/params';
import { can, getToken, requireUser } from '@/lib/session';
import type { AnonymisedPatient, Patient } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Patient list with search.
 *
 * The search term is passed straight to the backend, which applies it inside the
 * caller's scope. A doctor searching therefore cannot surface a patient outside
 * their own caseload.
 */
export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const token = await getToken();
  const params = await searchParams;

  // The identifiable list always answers 403 for a researcher, so they are
  // shown the anonymised cohort they are entitled to instead of that error.
  if (
    !can(user, 'patient:read_assigned') &&
    !can(user, 'patient:read_all') &&
    can(user, 'patient:read_anonymized')
  ) {
    return renderAnonymisedPatients(token, params);
  }

  const query = pickString(params, 'q') ?? '';
  const path = query
    ? `/patients?limit=100&q=${encodeURIComponent(query)}`
    : '/patients?limit=100';

  const result = await load(() => apiFetch<Patient[]>(path, { cache: 'no-store' }, token));
  const patients = result.ok ? result.data : [];
  const error = result.ok ? null : result.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Patients</h1>
          <p className="mt-1 text-sm opacity-70">
            {user.role === 'doctor'
              ? 'Only the patients assigned to you are listed.'
              : 'Hospital-wide patient records.'}
          </p>
        </div>

        <form method="get" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Record number or diagnosis"
            aria-label="Search patients"
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
          >
            Search
          </button>
        </form>
      </div>

      {error ? (
        <SectionError error={error} />
      ) : (
        <Card>
          <Table
            headers={['Record number', 'Age group', 'Gender', 'Primary diagnosis', '']}
            empty={query ? `No patients match "${query}".` : 'No patients yet.'}
          >
            {patients.map((patient) => (
              <Row key={patient.id}>
                <Cell>{patient.medical_record_number}</Cell>
                <Cell>{patient.age_group ?? '-'}</Cell>
                <Cell>{patient.gender ?? '-'}</Cell>
                <Cell>{patient.primary_diagnosis ?? '-'}</Cell>
                <Cell>
                  <Link
                    href={`/dashboard/patients/${patient.id}`}
                    className="underline underline-offset-2"
                  >
                    View
                  </Link>
                </Cell>
              </Row>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}

/** Researcher view: the de-identified cohort, filterable and paged. */
async function renderAnonymisedPatients(token: string | undefined, params: SearchParams) {
  const filters = readCohortFilters((key) => pickString(params, key));
  const page = pickPage(params);
  const cohort = await load(() =>
    apiFetchPage<AnonymisedPatient>(
      `/patients/anonymised${toQuery({
        ...filters,
        limit: COHORT_PAGE_SIZE,
        offset: (page - 1) * COHORT_PAGE_SIZE,
      })}`,
      { cache: 'no-store' },
      token,
    ),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Anonymised patient cohort</h1>
        <p className="mt-1 text-sm opacity-70">
          De-identified records only: a pseudonymous id, a 10-year age band, gender and primary
          diagnosis. For statistics and export, use{' '}
          <Link href="/dashboard/research" className="underline underline-offset-2">
            Research
          </Link>
          .
        </p>
      </div>
      <Card title="Filters">
        <CohortFilterForm filters={filters} />
      </Card>
      <LoadedCard
        title="Cohort"
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
            basePath="/dashboard/patients"
          />
        )}
      </LoadedCard>
    </div>
  );
}
