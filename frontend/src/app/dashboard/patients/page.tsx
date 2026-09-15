import Link from 'next/link';

import { Card, Cell, ErrorNote, RiskBadge, Row, Table } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { can, getToken, requireUser } from '@/lib/session';
import type { ForecastingReport, Patient, RiskCategory } from '@/types';

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

  // Risk bands for the whole visible cohort in ONE request, rather than a
  // per-row lookup. /reports/forecast already returns the high-risk cohort
  // scoped to this caller, so a patient absent from it is simply not high risk.
  const highRiskBands = new Map<number, RiskCategory>();

  try {
    patients = await apiFetch<Patient[]>(path, { cache: 'no-store' }, token);
  } catch {
    error =
      user.role === 'researcher'
        ? 'Researchers may only read the anonymised cohort.'
        : 'Could not load patients. Is the backend running?';
  }

  const canSeeRisk = can(user, 'risk_report:read');
  if (canSeeRisk && !error) {
    try {
      const report = await apiFetch<ForecastingReport>(
        '/reports/forecast?horizon_days=30',
        { cache: 'no-store' },
        token,
      );
      for (const entry of report.high_risk_patients ?? []) {
        highRiskBands.set(entry.patient_id, entry.risk_category);
      }
    } catch {
      // Risk is supplementary here - the patient list still stands without it.
    }
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
            headers={[
              'Record number',
              'Age group',
              'Gender',
              'Primary diagnosis',
              ...(canSeeRisk ? ['Risk'] : []),
              '',
            ]}
            empty={query ? `No patients match "${query}".` : 'No patients yet.'}
          >
            {patients.map((patient) => (
              <Row key={patient.id}>
                <Cell>{patient.medical_record_number}</Cell>
                <Cell>{patient.age_group ?? '-'}</Cell>
                <Cell>{patient.gender ?? '-'}</Cell>
                <Cell>{patient.primary_diagnosis ?? '-'}</Cell>
                {canSeeRisk && (
                  <Cell>
                    {highRiskBands.has(patient.id) ? (
                      <RiskBadge band={highRiskBands.get(patient.id)!} />
                    ) : (
                      <span className="text-xs opacity-50">Not high risk</span>
                    )}
                  </Cell>
                )}
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
