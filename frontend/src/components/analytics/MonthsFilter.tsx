export const MONTH_CHOICES = [6, 12, 24, 36] as const;

/** Plain GET form - the chosen window travels in the URL, so it is shareable and needs no JS. */
export default function MonthsFilter({ months }: { months: number }) {
  return (
    <form method="get" className="flex items-center gap-2 text-sm">
      <label htmlFor="months" className="opacity-70">
        Period
      </label>
      <select
        id="months"
        name="months"
        defaultValue={String(months)}
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
      >
        {MONTH_CHOICES.map((choice) => (
          <option key={choice} value={choice}>
            Last {choice} months with data
          </option>
        ))}
      </select>
      <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1">
        Apply
      </button>
    </form>
  );
}
