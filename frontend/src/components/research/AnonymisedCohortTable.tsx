import Link from 'next/link';

import { Cell, Row, Table } from '@/components/ui';
import { toQuery } from '@/lib/params';
import type { AnonymisedPatient, ResearchCohortFilters } from '@/types';

export const COHORT_PAGE_SIZE = 25;

/**
 * One page of the anonymised cohort. Only the four de-identified fields the
 * backend returns are rendered - there is no record number or link to a
 * patient page, because a researcher has no identifiable view to go to.
 */
export default function AnonymisedCohortTable({
  rows,
  total,
  page,
  filters,
  basePath,
}: {
  rows: AnonymisedPatient[];
  total: number;
  page: number;
  filters: ResearchCohortFilters;
  basePath: string;
}) {
  const pages = Math.max(1, Math.ceil(total / COHORT_PAGE_SIZE));
  const href = (target: number) => `${basePath}${toQuery({ ...filters, page: target })}`;

  return (
    <div className="space-y-3">
      <Table headers={['Pseudonymous id', 'Age band', 'Gender', 'Primary diagnosis']}>
        {rows.map((row) => (
          <Row key={row.pseudo_id}>
            <Cell>
              <code className="text-xs">{row.pseudo_id}</code>
            </Cell>
            <Cell>{row.age_group ?? '-'}</Cell>
            <Cell>{row.gender ?? '-'}</Cell>
            <Cell>{row.primary_diagnosis ?? '-'}</Cell>
          </Row>
        ))}
      </Table>
      <nav aria-label="Cohort pages" className="flex items-center justify-between text-sm">
        <span className="opacity-70">
          {total.toLocaleString('en-US')} patients · page {page} of {pages}
        </span>
        <span className="flex gap-2">
          {page > 1 && (
            <Link href={href(page - 1)} className="rounded-md border border-[var(--border)] px-3 py-1">
              Previous
            </Link>
          )}
          {page < pages && (
            <Link href={href(page + 1)} className="rounded-md border border-[var(--border)] px-3 py-1">
              Next
            </Link>
          )}
        </span>
      </nav>
    </div>
  );
}
