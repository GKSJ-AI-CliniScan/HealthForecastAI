import Link from 'next/link';

import { Badge, Card, Cell, ErrorNote, Row, StatTile, Table } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { getToken, requireUser } from '@/lib/session';
import type { Patient } from '@/types';

export const dynamic = 'force-dynamic';

interface Admission {
  id: number;
  patient_id: number;
  admission_date: string | null;
  discharge_date: string | null;
  time_in_hospital: number | null;
  admission_type: string | null;
  discharge_disposition: string | null;
  num_medications: number | null;
  readmitted: string | null;
}

interface ReadmissionSummary {
  patient_id: number;
  total_admissions: number;
  readmitted_total: number;
  by_label: Record<string, number>;
}

/**
 * Patient detail: demographics, readmission tracking and the admission timeline.
 *
 * A patient outside the caller's scope returns 404 from the backend, and this
 * page shows that as "not found" rather than as a permission error - matching the
 * backend's decision not to confirm that such a record exists.
 */
export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const token = await getToken();
  const { id } = await params;

  let patient: Patient | null = null;
  let admissions: Admission[] = [];
  let summary: ReadmissionSummary | null = null;

  try {
    patient = await apiFetch<Patient>(`/patients/${id}`, { cache: 'no-store' }, token);
    admissions = await apiFetch<Admission[]>(
      `/patients/${id}/admissions`,
      { cache: 'no-store' },
      token,
    );
    summary = await apiFetch<ReadmissionSummary>(
      `/patients/${id}/admissions/readmissions`,
      { cache: 'no-store' },
      token,
    );
  } catch {
    patient = null;
  }

  if (!patient) {
    return (
      <div className="space-y-4">
        <ErrorNote>That patient is not available to you.</ErrorNote>
        <Link href="/dashboard/patients" className="text-sm underline underline-offset-2">
          Back to patients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{patient.medical_record_number}</h1>
          <p className="mt-1 text-sm opacity-70">
            De-identified record. No name, address or date of birth is stored.
          </p>
        </div>
        <Link href="/dashboard/patients" className="text-sm underline underline-offset-2">
          Back to patients
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Admissions" value={summary?.total_admissions ?? admissions.length} />
        <StatTile label="Readmissions" value={summary?.readmitted_total ?? 0} />
        <StatTile label="Age group" value={patient.age_group ?? '-'} />
      </div>

      <Card title="Demographics">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="opacity-60">Gender</dt>
            <dd>{patient.gender ?? '-'}</dd>
          </div>
          <div>
            <dt className="opacity-60">Primary diagnosis</dt>
            <dd>{patient.primary_diagnosis ?? '-'}</dd>
          </div>
          <div>
            <dt className="opacity-60">Assigned doctor</dt>
            <dd>{patient.assigned_doctor_id ?? 'Unassigned'}</dd>
          </div>
        </dl>
      </Card>

      {summary && Object.keys(summary.by_label).length > 0 && (
        <Card title="Readmission outcomes">
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.by_label).map(([label, count]) => (
              <Badge key={label}>
                {label}: {count}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card title="Admission history">
        <Table
          headers={['Admitted', 'Discharged', 'Stay (days)', 'Type', 'Medications', 'Readmitted']}
          empty="No admissions recorded for this patient."
        >
          {admissions.map((admission) => (
            <Row key={admission.id}>
              <Cell>{admission.admission_date ?? '-'}</Cell>
              <Cell>{admission.discharge_date ?? '-'}</Cell>
              <Cell>{admission.time_in_hospital ?? '-'}</Cell>
              <Cell>{admission.admission_type ?? '-'}</Cell>
              <Cell>{admission.num_medications ?? '-'}</Cell>
              <Cell>{admission.readmitted ?? '-'}</Cell>
            </Row>
          ))}
        </Table>
      </Card>
    </div>
  );
}
