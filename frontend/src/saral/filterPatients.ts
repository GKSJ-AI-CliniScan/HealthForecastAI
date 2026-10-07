/**
 * filterPatients.ts — search + risk filter for the patients list.
 * Kept outside the page file because Next.js page files may only export the page,
 * and as a pure function it is unit-tested (tests/filter.test.mjs).
 */
import type { PatientRow, RiskLevel } from '../data/types';

/** Case-insensitive search over name, record number and illness. Exported for tests. */
export function filterPatients(rows: PatientRow[], query: string, risk: RiskLevel | 'all'): PatientRow[] {
  const q = query.trim().toLocaleLowerCase();
  return rows.filter(
    (p) => (risk === 'all' || p.risk === risk) && (!q || [p.name, p.mrn, p.illness ?? ''].some((f) => f.toLocaleLowerCase().includes(q))),
  );
}
