import type { Patient } from '@/types';

/**
 * Renders the patient list.
 *
 * The identifier column changes with the caller's role: an anonymised cohort has
 * no medical record number, so the component shows the cohort id instead rather
 * than rendering an empty column.
 */
export function PatientTable({
  rows,
  anonymised,
}: {
  rows: Patient[];
  anonymised: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">No patient records are visible to your role yet.</p>
        <p className="mt-1 text-xs text-slate-400">
          Load the dataset with the seed script to populate this table.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
              {anonymised ? 'Cohort ID' : 'Record number'}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
              Age group
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
              Gender
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
              Primary diagnosis
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((patient, index) => (
            <tr key={patient.cohort_id ?? patient.id ?? index} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs text-slate-700">
                {anonymised ? patient.cohort_id : patient.medical_record_number}
              </td>
              <td className="px-4 py-3 text-slate-700">{patient.age_group ?? '—'}</td>
              <td className="px-4 py-3 text-slate-700">{patient.gender ?? '—'}</td>
              <td className="px-4 py-3 text-slate-700">{patient.primary_diagnosis ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
