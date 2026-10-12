import type { ResearchCohortFilters } from '@/types';

const inputClass = 'field';

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
    <form
      method="get"
      action={action}
      className="grid items-end gap-4 text-sm sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
    >
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className="font-semibold text-ink">Primary diagnosis</span>
        <input name="diagnosis" defaultValue={filters.diagnosis} maxLength={255} className={inputClass} />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className="font-semibold text-ink">Gender</span>
        <input name="gender" defaultValue={filters.gender} maxLength={16} className={inputClass} />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className="font-semibold text-ink">Age band</span>
        <input
          name="age_band"
          defaultValue={filters.age_band}
          maxLength={16}
          placeholder="e.g. 60-69"
          className={inputClass}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className="font-semibold text-ink">Admitted from</span>
        <input type="date" name="date_from" defaultValue={filters.date_from} className={inputClass} />
      </label>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className="font-semibold text-ink">Admitted to</span>
        <input type="date" name="date_to" defaultValue={filters.date_to} className={inputClass} />
      </label>
      <button type="submit" className="btn btn-primary">
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
