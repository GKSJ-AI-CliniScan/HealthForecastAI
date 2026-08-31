import Link from 'next/link';

import { Card, Cell, ErrorNote, Row, Table } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { getToken, requireUser } from '@/lib/session';
import type { Patient } from '@/types';

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
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const token = await getToken();
  const { q } = await searchParams;

  const query = q?.trim() ?? '';
  const path = query
    ? `/patients?limit=100&q=${encodeURIComponent(query)}`
    : '/patients?limit=100';

  let patients: Patient[] = [];
  let error: string | null = null;

  try {
    patients = await apiFetch<Patient[]>(path, { cache: 'no-store' }, token);
  } catch {
    error =
      user.role === 'researcher'
        ? 'Researchers may only read the anonymised cohort.'
        : 'Could not load patients. Is the backend running?';
  }

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
        <ErrorNote>{error}</ErrorNote>
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
