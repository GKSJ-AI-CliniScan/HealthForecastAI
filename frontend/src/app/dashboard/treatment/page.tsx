import CategoryBarChart from '@/components/charts/CategoryBarChart';
import MultiBarChart from '@/components/charts/MultiBarChart';
import TrendLineChart from '@/components/charts/TrendLineChart';
import { Card, Cell, Row, StatTile, Table } from '@/components/ui';
import { EmptyState, LoadedCard, NoAccess, SectionError } from '@/components/ui/states';
import { apiFetch } from '@/lib/api';
import { load, type Loaded } from '@/lib/errors';
import { formatNumber, formatPercent } from '@/lib/format';
import { pickChoice, pickString, toQuery, type SearchParams } from '@/lib/params';
import { can, getToken, requireUser } from '@/lib/session';
import type {
  DepartmentEffectiveness,
  ReadmissionReduction,
  RecoveryTrendPoint,
  TreatmentComparison,
  TreatmentOutcomeDistribution,
  TreatmentRateSummary,
} from '@/types';

export const dynamic = 'force-dynamic';

const WEEK_CHOICES = [8, 12, 26, 52] as const;

const OUTCOME_SERIES = [
  { key: 'improved', label: 'Improved' },
  { key: 'unchanged', label: 'Unchanged' },
  { key: 'worsened', label: 'Worsened' },
  { key: 'unknown', label: 'Unknown' },
  { key: 'unrecorded', label: 'Not recorded' },
];

const inputClass =
  'rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm';

/** Carry the current filters into a nested form so submitting one does not drop the others. */
function Hidden({ values }: { values: Record<string, string | undefined> }) {
  return (
    <>
      {Object.entries(values).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
    </>
  );
}

/**
 * Treatment Effectiveness Dashboard (Module 4).
 *
 * A doctor holds only TREATMENT_REPORT_READ_LIMITED, and the backend narrows
 * every figure to their own patients - the page says so rather than implying
 * hospital-wide numbers.
 */
export default async function TreatmentEffectivenessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const limited = !can(user, 'treatment_report:read');
  if (limited && !can(user, 'treatment_report:read_limited')) {
    return <NoAccess what="treatment effectiveness reports" />;
  }

  const token = await getToken();
  const params = await searchParams;
  const treatmentName = pickString(params, 'treatment_name');
  const department = pickString(params, 'department');
  const weeks = pickChoice(params, 'weeks', WEEK_CHOICES, 12);
  const diagnosis = pickString(params, 'diagnosis');
  const reduction = pickString(params, 'reduction');
  const options = { cache: 'no-store' } as const;
  const filterQuery = toQuery({ treatment_name: treatmentName, department });

  const [rates, outcomes, departments, recovery, comparison, reductionResult] = await Promise.all([
    load(() => apiFetch<TreatmentRateSummary[]>(`/treatment${filterQuery}`, options, token)),
    load(() =>
      apiFetch<TreatmentOutcomeDistribution[]>(`/treatment/outcomes${filterQuery}`, options, token),
    ),
    load(() => apiFetch<DepartmentEffectiveness[]>('/treatment/departments', options, token)),
    load(() =>
      apiFetch<RecoveryTrendPoint[]>(
        `/treatment/recovery-trends${toQuery({ treatment_name: treatmentName, weeks })}`,
        options,
        token,
      ),
    ),
    diagnosis
      ? load(() =>
          apiFetch<TreatmentComparison[]>(
            `/treatment/compare${toQuery({ diagnosis })}`,
            options,
            token,
          ),
        )
      : Promise.resolve(null),
    reduction
      ? load(() =>
          apiFetch<ReadmissionReduction>(
            `/treatment/readmission-reduction${toQuery({ treatment_name: reduction })}`,
            options,
            token,
          ),
        )
      : Promise.resolve(null),
  ]);

  const keep = {
    treatment_name: treatmentName,
    department,
    weeks: String(weeks),
    diagnosis,
    reduction,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Treatment effectiveness</h1>
        <p className="mt-1 text-sm opacity-70">
          {limited
            ? 'Figures cover only the patients assigned to you.'
            : 'Hospital-wide treatment outcomes.'}{' '}
          Success rate is the share of outcomes recorded as improved.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <Hidden values={{ weeks: keep.weeks, diagnosis, reduction }} />
        <label className="flex flex-col gap-1">
          <span className="opacity-70">Treatment</span>
          <input
            name="treatment_name"
            defaultValue={treatmentName}
            maxLength={255}
            placeholder="All treatments"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="opacity-70">Department</span>
          <input
            name="department"
            defaultValue={department}
            maxLength={100}
            placeholder="All departments"
            className={inputClass}
          />
        </label>
        <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1">
          Apply
        </button>
      </form>

      <LoadedCard
        title="Success rate by treatment"
        result={rates}
        isEmpty={(rows) => rows.length === 0}
        empty="No treatment outcomes match these filters."
      >
        {(rows) => (
          <div className="space-y-6">
            <CategoryBarChart
              label="Success rate by treatment"
              data={rows.map((row) => ({ name: row.treatment_name, value: row.success_rate }))}
              valueFormat="percent"
              horizontal
              color="#22c55e"
            />
            <Table headers={['Treatment', 'Outcomes', 'Avg recovery score', 'Success rate']}>
              {rows.map((row) => (
                <Row key={row.treatment_name}>
                  <Cell>{row.treatment_name}</Cell>
                  <Cell>{formatNumber(row.sample_size)}</Cell>
                  <Cell>{formatNumber(row.average_recovery_score, 2)}</Cell>
                  <Cell>{formatPercent(row.success_rate)}</Cell>
                </Row>
              ))}
            </Table>
          </div>
        )}
      </LoadedCard>

      <LoadedCard
        title="Outcome distribution"
        result={outcomes}
        isEmpty={(rows) => rows.length === 0}
        empty="No treatment outcomes match these filters."
      >
        {(rows) => (
          <MultiBarChart
            label="Outcomes per treatment"
            data={rows.map((row) => ({ treatment: row.treatment_name, ...row.outcomes }))}
            xKey="treatment"
            series={OUTCOME_SERIES}
            stacked
          />
        )}
      </LoadedCard>

      <LoadedCard
        title="Recovery trend"
        result={recovery}
        isEmpty={(rows) => rows.length === 0}
        empty="No discharged admissions with a recovery score yet."
        actions={
          <form method="get" className="flex items-center gap-2 text-sm">
            <Hidden values={{ treatment_name: treatmentName, department, diagnosis, reduction }} />
            <select name="weeks" defaultValue={keep.weeks} aria-label="Weeks" className={inputClass}>
              {WEEK_CHOICES.map((choice) => (
                <option key={choice} value={choice}>
                  Last {choice} weeks with data
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1">
              Apply
            </button>
          </form>
        }
      >
        {(rows) => (
          <TrendLineChart
            label="Weekly average recovery score"
            data={rows.map((row) => ({
              week: row.week_start,
              score: row.average_recovery_score,
            }))}
            xKey="week"
            series={[{ key: 'score', label: 'Average recovery score', color: '#22c55e' }]}
            valueFormat="decimal"
          />
        )}
      </LoadedCard>

      <LoadedCard
        title="Effectiveness by department"
        result={departments}
        isEmpty={(rows) => rows.length === 0}
        empty="No treatment outcomes recorded yet."
      >
        {(rows) => (
          <div className="space-y-6">
            <MultiBarChart
              label="Success and readmission rate by department"
              data={rows.map((row) => ({
                department: row.department,
                success: row.success_rate,
                readmission: row.readmission_rate,
              }))}
              xKey="department"
              series={[
                { key: 'success', label: 'Success rate', color: '#22c55e' },
                { key: 'readmission', label: 'Readmission rate', color: '#ef4444' },
              ]}
              valueFormat="percent"
            />
            <Table
              headers={['Department', 'Outcomes', 'Avg recovery', 'Success rate', 'Readmission rate']}
            >
              {rows.map((row) => (
                <Row key={row.department}>
                  <Cell>{row.department}</Cell>
                  <Cell>{formatNumber(row.sample_size)}</Cell>
                  <Cell>{formatNumber(row.average_recovery_score, 2)}</Cell>
                  <Cell>{formatPercent(row.success_rate)}</Cell>
                  <Cell>{formatPercent(row.readmission_rate)}</Cell>
                </Row>
              ))}
            </Table>
          </div>
        )}
      </LoadedCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Compare treatments for a diagnosis">
          <form method="get" className="mb-4 flex flex-wrap gap-2 text-sm">
            <Hidden values={{ treatment_name: treatmentName, department, weeks: keep.weeks, reduction }} />
            <input
              name="diagnosis"
              defaultValue={diagnosis}
              required
              maxLength={255}
              placeholder="Primary diagnosis"
              aria-label="Diagnosis to compare"
              className={`${inputClass} flex-1`}
            />
            <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1">
              Compare
            </button>
          </form>
          <ComparisonResult result={comparison} />
        </Card>

        <Card title="Readmission reduction">
          <form method="get" className="mb-4 flex flex-wrap gap-2 text-sm">
            <Hidden values={{ treatment_name: treatmentName, department, weeks: keep.weeks, diagnosis }} />
            <input
              name="reduction"
              defaultValue={reduction}
              required
              maxLength={255}
              placeholder="Treatment name"
              aria-label="Treatment to evaluate"
              className={`${inputClass} flex-1`}
            />
            <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1">
              Evaluate
            </button>
          </form>
          <ReductionResult result={reductionResult} />
        </Card>
      </div>
    </div>
  );
}

function ComparisonResult({ result }: { result: Loaded<TreatmentComparison[]> | null }) {
  if (result === null) {
    return <EmptyState>Enter a diagnosis to compare the treatments applied to it.</EmptyState>;
  }
  if (!result.ok) {
    return <SectionError error={result.error} />;
  }
  if (result.data.length === 0) {
    return <EmptyState>No treatments recorded for that diagnosis.</EmptyState>;
  }
  return (
    <Table headers={['Treatment', 'Outcomes', 'Success', 'Readmission']}>
      {result.data.map((row) => (
        <Row key={row.treatment_name}>
          <Cell>{row.treatment_name}</Cell>
          <Cell>{formatNumber(row.sample_size)}</Cell>
          <Cell>{formatPercent(row.success_rate)}</Cell>
          <Cell>{formatPercent(row.readmission_rate)}</Cell>
        </Row>
      ))}
    </Table>
  );
}

function ReductionResult({ result }: { result: Loaded<ReadmissionReduction> | null }) {
  if (result === null) {
    return (
      <EmptyState>
        Enter a treatment to compare its readmission rate with the baseline.
      </EmptyState>
    );
  }
  if (!result.ok) {
    return <SectionError error={result.error} />;
  }
  const data = result.data;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile label="With treatment" value={formatPercent(data.treatment_readmission_rate)} />
      <StatTile label="Baseline" value={formatPercent(data.hospital_baseline_readmission_rate)} />
      <StatTile label="Admissions" value={formatNumber(data.sample_size)} />
    </div>
  );
}
