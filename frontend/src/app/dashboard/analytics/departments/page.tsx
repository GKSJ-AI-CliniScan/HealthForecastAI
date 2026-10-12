import CategoryBarChart from '@/components/charts/CategoryBarChart';
import { PALETTE } from '@/components/charts/chartUtils';
import { Cell, Row, Table } from '@/components/ui';
import { LoadedCard, NoAccess } from '@/components/ui/states';
import { apiFetch } from '@/lib/api';
import { load } from '@/lib/errors';
import { formatNumber, formatPercent } from '@/lib/format';
import { pickChoice, pickString, toQuery, type SearchParams } from '@/lib/params';
import { can, getToken, requireUser } from '@/lib/session';
import type { DepartmentAnalytics, DepartmentSortField, SortOrder } from '@/types';

export const dynamic = 'force-dynamic';

const SORT_FIELDS: { value: DepartmentSortField; label: string }[] = [
  { value: 'department', label: 'Department' },
  { value: 'total_admissions', label: 'Admissions' },
  { value: 'readmission_rate', label: 'Readmission rate' },
  { value: 'average_length_of_stay', label: 'Length of stay' },
];
const ORDERS: SortOrder[] = ['asc', 'desc'];

const inputClass = 'field';

/** Department Performance Dashboard. Sorting and the date window are applied by the backend. */
export default async function DepartmentPerformancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  if (!can(user, 'hospital_analytics:read')) {
    return <NoAccess what="department analytics" />;
  }
  const token = await getToken();
  const params = await searchParams;
  const dateFrom = pickString(params, 'date_from');
  const dateTo = pickString(params, 'date_to');
  const sortBy = pickChoice(
    params,
    'sort_by',
    SORT_FIELDS.map((field) => field.value),
    'total_admissions',
  );
  const order = pickChoice(params, 'order', ORDERS, 'desc');

  const query = toQuery({ date_from: dateFrom, date_to: dateTo, sort_by: sortBy, order });
  const departments = await load(() =>
    apiFetch<DepartmentAnalytics[]>(`/analytics/departments${query}`, { cache: 'no-store' }, token),
  );

  return (
    <div className="space-y-6">
      <form method="get" className="flex flex-wrap items-end gap-4 rounded-[10px] border border-rule bg-surface p-4 text-sm">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-ink-muted">Admitted from</span>
          <input type="date" name="date_from" defaultValue={dateFrom} className={inputClass} />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-ink-muted">Admitted to</span>
          <input type="date" name="date_to" defaultValue={dateTo} className={inputClass} />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-ink-muted">Sort by</span>
          <select name="sort_by" defaultValue={sortBy} className={inputClass}>
            {SORT_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-ink-muted">Order</span>
          <select name="order" defaultValue={order} className={inputClass}>
            <option value="desc">Highest first</option>
            <option value="asc">Lowest first</option>
          </select>
        </label>
        <button type="submit" className="btn btn-secondary btn-sm">
          Apply
        </button>
      </form>

      <LoadedCard
        title="Department comparison"
        result={departments}
        isEmpty={(rows) => rows.length === 0}
        empty="No admissions fall inside this window."
      >
        {(rows) => (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-panel text-ink">Readmission rate</h3>
                <CategoryBarChart
                  label="Readmission rate by department"
                  data={rows.map((row) => ({ name: row.department, value: row.readmission_rate }))}
                  valueFormat="percent"
                  horizontal
                  color={PALETTE[2]}
                />
              </div>
              <div>
                <h3 className="mb-3 text-panel text-ink">Admissions</h3>
                <CategoryBarChart
                  label="Admissions by department"
                  data={rows.map((row) => ({ name: row.department, value: row.total_admissions }))}
                  horizontal
                />
              </div>
            </div>
            <Table
              headers={['Department', 'Patients', 'Admissions', 'Avg stay (days)', 'Readmission rate']}
            >
              {rows.map((row) => (
                <Row key={row.department}>
                  <Cell>{row.department}</Cell>
                  <Cell>{formatNumber(row.total_patients)}</Cell>
                  <Cell>{formatNumber(row.total_admissions)}</Cell>
                  <Cell>{formatNumber(row.average_length_of_stay, 1)}</Cell>
                  <Cell>{formatPercent(row.readmission_rate)}</Cell>
                </Row>
              ))}
            </Table>
          </div>
        )}
      </LoadedCard>
    </div>
  );
}
