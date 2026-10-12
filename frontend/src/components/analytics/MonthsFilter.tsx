export const MONTH_CHOICES = [6, 12, 24, 36] as const;

/** Plain GET form - the chosen window travels in the URL, so it is shareable and needs no JS. */
export default function MonthsFilter({ months }: { months: number }) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="months" className="font-semibold text-ink">
        Period
      </label>
      <select
        id="months"
        name="months"
        defaultValue={String(months)}
        className="field w-auto py-1.5"
      >
        {MONTH_CHOICES.map((choice) => (
          <option key={choice} value={choice}>
            Last {choice} months with data
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-secondary btn-sm">
        Apply
      </button>
    </form>
  );
}
