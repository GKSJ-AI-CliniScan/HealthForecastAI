'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Activity } from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { P } from '@/lib/permissions';

import type {
  Patient,
  RecoveryTrendPoint,
  TreatmentEffectivenessSummary,
  TreatmentMethodCount,
} from '@/types';

import {
  EmptyState,
  ErrorState,
  FormField,
  KpiCard,
  PageHeader,
  SectionCard,
  SubmitButton,
  SuccessNotice,
  TableSkeleton,
} from '@/components/ui';

const TYPES = [
  'insulin_therapy',
  'metformin',
  'sulfonylurea',
  'lifestyle_intervention',
  'oral_hypoglycemics',
  'combination_therapy',
];

const OUTCOMES = [
  'improved',
  'unchanged',
  'worsened',
];

export default function TreatmentPage() {
  const { token, permissions } = useAuth();

  const full = permissions.includes(P.treatment);
  const limited = permissions.includes(P.treatmentLimited);

  const [summary, setSummary] =
    useState<TreatmentEffectivenessSummary | null>(null);

  const [trends, setTrends] =
    useState<RecoveryTrendPoint[]>([]);

  const [treatmentMethods, setTreatmentMethods] =
    useState<TreatmentMethodCount[]>([]);

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [filter, setFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    patient_id: '',
    treatment_type: 'metformin',
    outcome_status: 'improved',
    recovery_days: '10',
    effectiveness_score: '0.6',
  });

  /*
   * Load treatment effectiveness data.
   *
   * useCallback keeps the function stable between renders
   * and allows the effect below to depend safely on it.
   */
  const load = useCallback(async () => {
    if (!token || !full) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const query = filter
        ? `?treatment_type=${encodeURIComponent(filter)}`
        : '';

      const [
        summaryData,
        trendData,
        methodData,
      ] = await Promise.all([
        apiFetch<TreatmentEffectivenessSummary>(
          `/treatment${query}`,
          {},
          token,
        ),

        apiFetch<RecoveryTrendPoint[]>(
          '/treatment/recovery-trends',
          {},
          token,
        ),

        apiFetch<TreatmentMethodCount[]>(
          '/treatment/method-counts',
          {},
          token,
        ),
      ]);

      setSummary(summaryData);
      setTrends(trendData);

      setTreatmentMethods(
        Array.isArray(methodData)
          ? methodData
          : [],
      );
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not load treatment effectiveness data.',
      );
    } finally {
      setLoading(false);
    }
  }, [token, full, filter]);

  /*
   * Reload treatment data when authentication,
   * permission or treatment filter changes.
   */
  useEffect(() => {
    void load();
  }, [load]);

  /*
   * Load patients for the treatment outcome form.
   */
  useEffect(() => {
    if (!token || !full) {
      return;
    }

    apiFetch<Patient[]>(
      '/patients',
      {},
      token,
    )
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [token, full]);

  /*
   * Submit a new treatment outcome.
   */
  async function submit(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (!token) {
      return;
    }

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(
        '/treatment',
        {
          method: 'POST',
          body: JSON.stringify({
            patient_id: Number(form.patient_id),
            treatment_type: form.treatment_type,
            outcome_status: form.outcome_status,
            recovery_days: form.recovery_days
              ? Number(form.recovery_days)
              : null,
            effectiveness_score:
              form.effectiveness_score
                ? Number(form.effectiveness_score)
                : null,
          }),
        },
        token,
      );

      setShow(false);

      setSuccess(
        'Treatment outcome saved.',
      );

      setForm({
        ...form,
        patient_id: '',
      });

      await load();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not save the treatment outcome.',
      );
    } finally {
      setBusy(false);
    }
  }

  /*
   * Convert backend effectiveness values
   * such as 0.60 -> 60%.
   */
  const chart = useMemo(
    () =>
      trends.map((item) => ({
        month: item.month,
        effectiveness:
          item.avg_effectiveness == null
            ? null
            : item.avg_effectiveness * 100,
        cases: item.case_count,
      })),
    [trends],
  );

  /*
   * Calculate the observed chart range.
   *
   * This prevents a small variation from appearing
   * completely flat.
   */
  const values = chart
    .map((item) => item.effectiveness)
    .filter(
      (value): value is number =>
        value !== null,
    );

  const minEffect = values.length
    ? Math.min(...values)
    : 0;

  const maxEffect = values.length
    ? Math.max(...values)
    : 100;

  const spread = Math.max(
    5,
    maxEffect - minEffect,
  );

  const yMin = Math.max(
    0,
    Math.floor(
      (minEffect - spread * 0.35) * 10,
    ) / 10,
  );

  const yMax = Math.min(
    100,
    Math.ceil(
      (maxEffect + spread * 0.35) * 10,
    ) / 10,
  );

  /*
   * Convert:
   *
   * insulin_therapy
   *
   * into:
   *
   * Insulin Therapy
   */
  function formatTreatmentName(
    value: string,
  ) {
    return value
      .replaceAll('_', ' ')
      .replace(
        /\b\w/g,
        (char) => char.toUpperCase(),
      );
  }

  /*
   * Limited treatment access.
   *
   * Doctors with treatment_report:read_limited
   * should not see actions that require the
   * full treatment_report:read permission.
   */
  if (limited && !full) {
    return (
      <div>
        <PageHeader
          eyebrow="Treatment effectiveness"
          title="Treatment outcomes"
          description="Your doctor role has limited treatment-report access. The current backend exposes full treatment endpoints only, so actions that would return 403 are intentionally not rendered."
        />

        <SectionCard>
          <EmptyState
            title="Limited treatment access"
            message="You can continue using assigned-patient risk, forecast and clinical-support workflows. Aggregated treatment actions require treatment_report:read."
            icon={
              <Activity className="h-5 w-5" />
            }
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Treatment effectiveness"
        title="Treatment outcomes"
        description="Review aggregated treatment effectiveness, recovery trends and recorded outcomes."
        actions={
          full ? (
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="btn-primary"
            >
              {show
                ? 'Close form'
                : '+ Log outcome'}
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorState
            message={error}
            onRetry={() => void load()}
          />
        </div>
      )}

      {success && (
        <div className="mb-5">
          <SuccessNotice
            message={success}
          />
        </div>
      )}

      {show && (
        <SectionCard
          title="Record treatment outcome"
          description="The backend accepts diabetes treatment outcome records."
          className="mb-6"
        >
          <form
            onSubmit={submit}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            {/* Patient */}
            <FormField
              label="Patient"
              htmlFor="patient"
            >
              <select
                id="patient"
                required
                value={form.patient_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    patient_id:
                      e.target.value,
                  })
                }
                className="field mt-1.5"
              >
                <option value="">
                  Select patient
                </option>

                {patients.map((patient) => (
                  <option
                    key={patient.id}
                    value={patient.id}
                  >
                    {patient.medical_record_number}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Treatment */}
            <FormField
              label="Treatment"
              htmlFor="tt"
            >
              <select
                id="tt"
                value={form.treatment_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    treatment_type:
                      e.target.value,
                  })
                }
                className="field mt-1.5"
              >
                {TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Outcome */}
            <FormField
              label="Outcome"
              htmlFor="outcome"
            >
              <select
                id="outcome"
                value={form.outcome_status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    outcome_status:
                      e.target.value,
                  })
                }
                className="field mt-1.5"
              >
                {OUTCOMES.map(
                  (outcome) => (
                    <option
                      key={outcome}
                      value={outcome}
                    >
                      {outcome}
                    </option>
                  ),
                )}
              </select>
            </FormField>

            {/* Recovery days */}
            <FormField
              label="Recovery days"
              htmlFor="days"
            >
              <input
                id="days"
                type="number"
                min="0"
                value={form.recovery_days}
                onChange={(e) =>
                  setForm({
                    ...form,
                    recovery_days:
                      e.target.value,
                  })
                }
                className="field mt-1.5"
              />
            </FormField>

            {/* Effectiveness */}
            <FormField
              label="Effectiveness"
              htmlFor="eff"
            >
              <input
                id="eff"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={
                  form.effectiveness_score
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    effectiveness_score:
                      e.target.value,
                  })
                }
                className="field mt-1.5"
              />

              <p className="mt-1 text-[11px] text-slate-400">
                Enter a value between 0 and 1.
              </p>
            </FormField>

            <div className="flex justify-end sm:col-span-2 lg:col-span-5">
              <SubmitButton loading={busy}>
                Save outcome
              </SubmitButton>
            </div>
          </form>
        </SectionCard>
      )}

      {/* KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total cases"
          value={
            loading
              ? '—'
              : summary?.total_cases ?? 0
          }
          icon={
            <Activity className="h-5 w-5" />
          }
        />

        <KpiCard
          label="Improved rate"
          value={
            loading
              ? '—'
              : `${(
                  (summary?.improved_rate ??
                    0) * 100
                ).toFixed(1)}%`
          }
          accent="green"
        />

        <KpiCard
          label="Average recovery"
          value={
            loading
              ? '—'
              : summary?.avg_recovery_days ==
                  null
                ? '—'
                : `${summary.avg_recovery_days} days`
          }
          accent="teal"
        />
      </div>

      {/* RECOVERY TREND */}
      <SectionCard
        title="Recovery trend"
        description={
          chart.length > 1
            ? `Monthly average effectiveness across ${chart.length} recorded points. The chart zooms to the observed range so small changes remain visible.`
            : 'Monthly average effectiveness score from stored treatment outcomes.'
        }
        className="mt-6"
        actions={
          <select
            aria-label="Treatment filter"
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value)
            }
            className="field w-auto py-2 text-xs"
          >
            <option value="">
              All treatments
            </option>

            {TYPES.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}
          </select>
        }
      >
        {loading ? (
          <TableSkeleton
            columns={3}
            rows={4}
          />
        ) : chart.length === 0 ? (
          <EmptyState
            title="No outcomes recorded"
            message="Treatment trend data will appear after outcome records are stored."
          />
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={chart}
                  margin={{
                    left: 0,
                    right: 12,
                    top: 16,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 11,
                      fill: '#64748b',
                    }}
                  />

                  <YAxis
                    domain={[
                      yMin,
                      yMax,
                    ]}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                    tick={{
                      fontSize: 11,
                      fill: '#64748b',
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border:
                        '1px solid #dce5ee',
                      fontSize: 12,
                    }}
                    formatter={(
                      value,
                      name,
                    ) => {
                      if (
                        name ===
                        'effectiveness'
                      ) {
                        return [
                          value == null
                            ? '—'
                            : `${Number(
                                value,
                              ).toFixed(
                                1,
                              )}%`,
                          'Avg effectiveness',
                        ];
                      }

                      return [
                        value ?? '—',
                        'Cases',
                      ];
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="effectiveness"
                    stroke="#0e8fa3"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      strokeWidth: 2,
                      fill: '#fff',
                    }}
                    activeDot={{
                      r: 6,
                    }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart metadata */}
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Observed range:{' '}
                {values.length
                  ? `${minEffect.toFixed(
                      1,
                    )}%–${maxEffect.toFixed(
                      1,
                    )}%`
                  : '—'}
              </span>

              <span>
                {chart.length} monthly points
              </span>
            </div>

            {/* DATA TABLE */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="pb-3">
                      Month
                    </th>

                    <th className="pb-3">
                      Avg effectiveness
                    </th>

                    <th className="pb-3">
                      Cases
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {trends.map(
                    (trend) => (
                      <tr
                        key={trend.month}
                      >
                        <td className="py-3 font-mono text-xs">
                          {trend.month}
                        </td>

                        <td className="py-3">
                          {trend.avg_effectiveness ==
                          null
                            ? '—'
                            : `${(
                                trend.avg_effectiveness *
                                100
                              ).toFixed(
                                1,
                              )}%`}
                        </td>

                        <td className="py-3">
                          {trend.case_count}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>

      {/* PATIENTS BY TREATMENT METHOD */}
      <SectionCard
        title="Patients by Treatment Method"
        description="Number of unique patients recorded for each treatment method."
        className="mt-6"
      >
        {loading ? (
          <TableSkeleton
            columns={2}
            rows={5}
          />
        ) : treatmentMethods.length === 0 ? (
          <EmptyState
            title="No treatment method data"
            message="Treatment method counts will appear after treatment outcomes are recorded."
          />
        ) : (
          <div className="space-y-5">
            {treatmentMethods.map(
              (item) => {
                const maxCount =
                  Math.max(
                    ...treatmentMethods.map(
                      (method) =>
                        method.patient_count,
                    ),
                    1,
                  );

                const width =
                  (item.patient_count /
                    maxCount) *
                  100;

                return (
                  <div
                    key={
                      item.treatment_type
                    }
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-slate-700">
                        {formatTreatmentName(
                          item.treatment_type,
                        )}
                      </span>

                      <span className="shrink-0 text-sm font-semibold text-slate-900">
                        {item.patient_count}{' '}
                        patients
                      </span>
                    </div>

                    <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            width,
                            4,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}