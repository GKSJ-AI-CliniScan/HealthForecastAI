import Link from 'next/link';

import PurgeReportsButton from '@/components/reports/PurgeReportsButton';
import ReportGenerator from '@/components/reports/ReportGenerator';
import ReportHistory from '@/components/reports/ReportHistory';
import { Card } from '@/components/ui';
import { LoadedCard, NoAccess } from '@/components/ui/states';
import { apiFetch, apiFetchPage } from '@/lib/api';
import { load } from '@/lib/errors';
import { pickChoice, pickPage, toQuery, type SearchParams } from '@/lib/params';
import { availableReportTypes, REPORT_TYPES } from '@/lib/reports';
import { can, getToken, requireUser } from '@/lib/session';
import type { Report, ReportType, User } from '@/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

/**
 * Reporting (FR-RPT-01/02): generate CSV / Excel / PDF reports and manage
 * the history. The backend returns only the caller's own reports, or every
 * report for a system administrator.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  if (!can(user, 'analytics:export')) {
    return <NoAccess what="reports" />;
  }
  const token = await getToken();
  const params = await searchParams;
  const page = pickPage(params);
  const typeFilter = pickChoice<ReportType | ''>(
    params,
    'report_type',
    REPORT_TYPES.map((option) => option.type),
    '',
  );
  const options = { cache: 'no-store' } as const;

  const [history, users] = await Promise.all([
    load(() =>
      apiFetchPage<Report>(
        `/reports${toQuery({
          report_type: typeFilter || undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        })}`,
        options,
        token,
      ),
    ),
    // Owner names can only be resolved by a role that may list accounts.
    can(user, 'user:manage')
      ? apiFetch<User[]>('/users?limit=200', options, token).catch(() => [] as User[])
      : Promise.resolve([] as User[]),
  ]);

  const ownerNames = Object.fromEntries(users.map((account) => [account.id, account.full_name]));
  const reportTypes = availableReportTypes(user.permissions);
  const pageHref = (target: number) =>
    `/dashboard/reports${toQuery({ report_type: typeFilter || undefined, page: target })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm opacity-70">
          Generate analytics reports as PDF, Excel or CSV. Reports are built from the same
          analytics shown on the dashboards.
        </p>
      </div>

      <Card title="Generate a report">
        <ReportGenerator options={reportTypes} />
      </Card>

      <LoadedCard
        title={user.role === 'system_admin' ? 'All reports' : 'Your reports'}
        result={history}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {can(user, 'system:configure') && <PurgeReportsButton />}
            <form method="get" className="flex items-center gap-2 text-sm">
              <select
                name="report_type"
                defaultValue={typeFilter}
                aria-label="Filter by report type"
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
              >
                <option value="">All types</option>
                {REPORT_TYPES.map((option) => (
                  <option key={option.type} value={option.type}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1">
                Filter
              </button>
            </form>
          </div>
        }
      >
        {(data) => {
          const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
          return (
            <div className="space-y-3">
              <ReportHistory
                reports={data.items}
                currentUserId={user.profile?.id ?? null}
                ownerNames={ownerNames}
              />
              {pages > 1 && (
                <nav aria-label="Report pages" className="flex items-center justify-between text-sm">
                  <span className="opacity-70">
                    {data.total} reports · page {page} of {pages}
                  </span>
                  <span className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={pageHref(page - 1)}
                        className="rounded-md border border-[var(--border)] px-3 py-1"
                      >
                        Previous
                      </Link>
                    )}
                    {page < pages && (
                      <Link
                        href={pageHref(page + 1)}
                        className="rounded-md border border-[var(--border)] px-3 py-1"
                      >
                        Next
                      </Link>
                    )}
                  </span>
                </nav>
              )}
            </div>
          );
        }}
      </LoadedCard>
    </div>
  );
}
