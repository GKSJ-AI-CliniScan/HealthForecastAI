import type { ResearchCohortFilters } from '@/types';

const inputClass =
  'rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm';

/**
 * Research cohort filters as a plain GET form. Values are passed straight to
 * the backend, which validates them and applies the cohort-size guard after
 * filtering.
 */
export default function CohortFilterForm({
  filters,
  action,
}: {
  filters: ResearchCohortFilters;
  action?: string;
}) {
  return (
    <form method="get" action={action} className="flex flex-wrap items-end gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="opacity-70">Primary diagnosis</span>
        <input name="diagnosis" defaultValue={filters.diagnosis} maxLength={255} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="opacity-70">Gender</span>
        <input name="gender" defaultValue={filters.gender} maxLength={16} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="opacity-70">Age band</span>
        <input
          name="age_band"
          defaultValue={filters.age_band}
          maxLength={16}
          placeholder="e.g. 60-69"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="opacity-70">Admitted from</span>
        <input type="date" name="date_from" defaultValue={filters.date_from} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="opacity-70">Admitted to</span>
        <input type="date" name="date_to" defaultValue={filters.date_to} className={inputClass} />
      </label>
      <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1">
        Apply filters
      </button>
    </form>
  );
}

export function readCohortFilters(
  pick: (key: keyof ResearchCohortFilters) => string | undefined,
): ResearchCohortFilters {
  return {
    diagnosis: pick('diagnosis'),
    gender: pick('gender'),
    age_band: pick('age_band'),
    date_from: pick('date_from'),
    date_to: pick('date_to'),
  };
}
