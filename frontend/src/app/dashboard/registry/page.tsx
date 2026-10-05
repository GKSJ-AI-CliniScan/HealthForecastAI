// FILE: src/app/dashboard/registry/page.tsx

'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import { UserPlus, Users } from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api';
import { P } from '@/lib/permissions';

import type { Patient, RiskPrediction } from '@/types';

import {
  EmptyState,
  ErrorState,
  FormField,
  KpiCard,
  PageHeader,
  RiskPill,
  SectionCard,
  SubmitButton,
  SuccessNotice,
  TableSkeleton,
} from '@/components/ui';

const AGE = [
  '0-10',
  '10-20',
  '20-30',
  '30-40',
  '40-50',
  '50-60',
  '60-70',
  '70-80',
  '80-90',
  '90-100',
];

/* -------------------------------------------------------------------------- */
/* Risk score visual                                                          */
/* -------------------------------------------------------------------------- */

function RiskScoreBar({
  probability,
  category,
}: {
  probability: number;
  category: string;
}) {
  const percent =
    probability <= 1
      ? probability * 100
      : probability;

  const value = Math.max(
    0,
    Math.min(100, percent),
  );

  const normalizedCategory =
    category?.toLowerCase();

  const fillClass =
    normalizedCategory === 'high'
      ? 'bg-red-500'
      : normalizedCategory === 'medium'
        ? 'bg-amber-400'
        : 'bg-emerald-500';

  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-[76px] overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${fillClass}`}
          style={{
            width: `${Math.max(value, 3)}%`,
          }}
        />
      </div>

      <span className="min-w-[42px] text-xs font-bold text-slate-700">
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Registry() {
  const {
    token,
    permissions,
  } = useAuth();

  const canRead =
    permissions.includes(
      P.patientAssigned,
    ) ||
    permissions.includes(
      P.patientAll,
    );

  const canScore =
    permissions.includes(P.risk);

  const canCreate =
    permissions.includes(
      P.patientWrite,
    );

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [scores, setScores] =
    useState<Map<number, RiskPrediction>>(
      new Map(),
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [show, setShow] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [success, setSuccess] =
    useState('');

  const [form, setForm] = useState({
    medical_record_number: '',
    age_group: '50-60',
    gender: 'Male',
    primary_diagnosis: '',
    assigned_doctor_id: '',
  });

  /* ------------------------------------------------------------------------ */
  /* Load registry                                                            */
  /* ------------------------------------------------------------------------ */

  const load = useCallback(async () => {
    if (!token || !canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const patientData =
        await apiFetch<Patient[]>(
          '/patients',
          {},
          token,
        );

      setPatients(patientData);

      if (canScore) {
        const scoreData =
          await apiFetch<RiskPrediction[]>(
            '/risk/scores',
            {},
            token,
          );

        setScores(
          new Map(
            scoreData.map((score) => [
              score.patient_id,
              score,
            ]),
          ),
        );
      } else {
        setScores(new Map());
      }
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not load the patient registry.',
      );
    } finally {
      setLoading(false);
    }
  }, [token, canRead, canScore]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ------------------------------------------------------------------------ */
  /* Create patient                                                           */
  /* ------------------------------------------------------------------------ */

  async function create(
    e: FormEvent,
  ) {
    e.preventDefault();

    if (!token) return;

    setBusy(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(
        '/patients',
        {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            assigned_doctor_id:
              form.assigned_doctor_id
                ? Number(
                    form.assigned_doctor_id,
                  )
                : null,
          }),
        },
        token,
      );

      setShow(false);

      setSuccess(
        'Patient created successfully.',
      );

      setForm({
        medical_record_number: '',
        age_group: '50-60',
        gender: 'Male',
        primary_diagnosis: '',
        assigned_doctor_id: '',
      });

      await load();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not create patient.',
      );
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Rows                                                                     */
  /* ------------------------------------------------------------------------ */

  const rows = useMemo(
    () =>
      patients.map((patient) => ({
        patient,
        score: scores.get(
          patient.id,
        ),
      })),
    [patients, scores],
  );

  /* ------------------------------------------------------------------------ */
  /* Risk distribution                                                        */
  /* ------------------------------------------------------------------------ */

  const counts = {
    low: 0,
    medium: 0,
    high: 0,
  };

  for (const row of rows) {
    if (row.score) {
      const category =
        row.score.risk_category;

      if (
        category === 'low' ||
        category === 'medium' ||
        category === 'high'
      ) {
        counts[category]++;
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Permission state                                                         */
  /* ------------------------------------------------------------------------ */

  if (!canRead) {
    return (
      <div>
        <PageHeader
          eyebrow="Patient registry"
          title="Patient registry"
          description="Your role does not include identifiable patient-list access."
        />

        <SectionCard>
          <EmptyState
            title="De-identified access only"
            message="Researchers should use the Research Cohort workspace."
            icon={
              <Users className="h-5 w-5" />
            }
          />
        </SectionCard>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <div>
      <PageHeader
        eyebrow="Patient data"
        title="Patient registry"
        description="Review visible patients and their latest readmission-risk signals."
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() =>
                setShow(!show)
              }
              className="btn-primary"
            >
              <UserPlus className="h-4 w-4" />

              {show
                ? 'Close'
                : 'New patient'}
            </button>
          ) : undefined
        }
      />

      {/* Messages */}

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

      {/* KPI cards */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Patients in scope"
          value={
            loading
              ? '—'
              : patients.length
          }
          icon={
            <Users className="h-5 w-5" />
          }
        />

        <KpiCard
          label="Low risk"
          value={
            canScore
              ? counts.low
              : '—'
          }
          accent="green"
        />

        <KpiCard
          label="Medium risk"
          value={
            canScore
              ? counts.medium
              : '—'
          }
          accent="amber"
        />

        <KpiCard
          label="High risk"
          value={
            canScore
              ? counts.high
              : '—'
          }
          accent="red"
        />
      </div>

      {/* Create patient */}

      {show && (
        <SectionCard
          title="Create patient"
          description="Only roles with patient:write can create identifiable patient records."
          className="mt-6"
        >
          <form
            onSubmit={create}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <FormField
              label="Medical record number"
              htmlFor="mrn"
            >
              <input
                id="mrn"
                required
                value={
                  form.medical_record_number
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    medical_record_number:
                      e.target.value,
                  })
                }
                className="field mt-1.5"
              />
            </FormField>

            <FormField
              label="Age group"
              htmlFor="age"
            >
              <select
                id="age"
                value={form.age_group}
                onChange={(e) =>
                  setForm({
                    ...form,
                    age_group:
                      e.target.value,
                  })
                }
                className="field mt-1.5"
              >
                {AGE.map((age) => (
                  <option
                    key={age}
                    value={age}
                  >
                    {age}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Gender"
              htmlFor="gender"
            >
              <select
                id="gender"
                value={form.gender}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gender:
                      e.target.value,
                  })
                }
                className="field mt-1.5"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </FormField>

            <FormField
              label="Primary diagnosis"
              htmlFor="diagnosis"
            >
              <input
                id="diagnosis"
                value={
                  form.primary_diagnosis
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    primary_diagnosis:
                      e.target.value,
                  })
                }
                className="field mt-1.5"
              />
            </FormField>

            <FormField
              label="Assigned doctor ID"
              htmlFor="doctor"
            >
              <input
                id="doctor"
                type="number"
                min="1"
                value={
                  form.assigned_doctor_id
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    assigned_doctor_id:
                      e.target.value,
                  })
                }
                className="field mt-1.5"
              />
            </FormField>

            <div className="flex items-end">
              <SubmitButton
                loading={busy}
              >
                Create patient
              </SubmitButton>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Patient table */}

      <SectionCard
        title="Visible patients"
        description={
          canScore
            ? 'Latest readmission-risk scores are displayed as compact visual signals.'
            : 'Individual risk scores are not available for this account.'
        }
        className="mt-6"
      >
        {loading ? (
          <TableSkeleton
            columns={6}
            rows={6}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No patients in scope"
            message="No patient records are currently visible for this account."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="pb-3">
                    MRN
                  </th>

                  <th className="pb-3">
                    Age / gender
                  </th>

                  <th className="pb-3">
                    Diagnosis
                  </th>

                  <th className="pb-3">
                    Risk category
                  </th>

                  <th className="pb-3">
                    Risk score
                  </th>

                  <th className="pb-3">
                    Assigned doctor
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map(
                  ({
                    patient,
                    score,
                  }) => (
                    <tr
                      key={
                        patient.id
                      }
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="py-4 font-mono text-xs font-semibold text-slate-700">
                        {
                          patient.medical_record_number
                        }
                      </td>

                      <td className="py-4 text-slate-600">
                        {
                          patient.age_group ??
                          '—'
                        }

                        {' · '}

                        {
                          patient.gender ??
                          '—'
                        }
                      </td>

                      <td className="py-4 text-slate-700">
                        {
                          patient.primary_diagnosis ??
                          '—'
                        }
                      </td>

                      <td className="py-4">
                        {score ? (
                          <RiskPill
                            category={
                              score.risk_category
                            }
                          />
                        ) : (
                          <span className="text-xs text-slate-400">
                            Not scored
                          </span>
                        )}
                      </td>

                      <td className="py-4">
                        {score ? (
                          <RiskScoreBar
                            probability={
                              score.readmission_probability
                            }
                            category={
                              score.risk_category
                            }
                          />
                        ) : (
                          <span className="text-xs text-slate-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="py-4 text-xs text-slate-500">
                        {
                          patient.assigned_doctor_id ??
                          '—'
                        }
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}