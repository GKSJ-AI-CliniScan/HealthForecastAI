import Link from 'next/link';

import AnonymisedCohortTable, {
  COHORT_PAGE_SIZE,
} from '@/components/research/AnonymisedCohortTable';
import CohortFilterForm, { readCohortFilters } from '@/components/research/CohortFilterForm';
import { Card, Cell, PageHeader, Row, Table } from '@/components/ui';
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
    <div className="space-y-8">
      <PageHeader
        title="Patients"
        description={
          user.role === 'doctor'
            ? 'Only the patients assigned to you are listed.'
            : 'Hospital-wide patient records.'
        }
        actions={
          <form method="get" role="search" className="flex w-full gap-2 sm:w-auto">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Record number or diagnosis"
              aria-label="Search patients"
              className="field min-w-0 sm:w-72"
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
        }
      />

      {error ? (
        <SectionError error={error} />
      ) : (
        <Card
          description={
            patients.length === 0
              ? undefined
              : patients.length >= 100
                ? 'Showing the first 100 records. Search to narrow the list.'
                : `${patients.length} ${patients.length === 1 ? 'record' : 'records'}${query ? ` matching "${query}"` : ''}.`
          }
        >
          <Table
            headers={['Record number', 'Age group', 'Gender', 'Primary diagnosis', '']}
            empty={query ? `No patients match "${query}".` : 'No patients yet.'}
          >
            {patients.map((patient) => (
              <Row key={patient.id}>
                <Cell>
                  <span className="font-semibold text-ink">{patient.medical_record_number}</span>
                </Cell>
                <Cell>{patient.age_group ?? '-'}</Cell>
                <Cell>{patient.gender ?? '-'}</Cell>
                <Cell>{patient.primary_diagnosis ?? '-'}</Cell>
                <Cell>
                  <Link
                    href={`/dashboard/patients/${patient.id}`}
                    className="link"
                    aria-label={`View ${patient.medical_record_number}`}
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
    <div className="space-y-8">
      <PageHeader
        title="Anonymised patient cohort"
        description={
          <>
            De-identified records only: a pseudonymous id, a 10-year age band, gender and primary
            diagnosis. For statistics and export, use{' '}
            <Link href="/dashboard/research" className="link">
              Research
            </Link>
            .
          </>
        }
      />
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
