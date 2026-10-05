'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  Calculator,
  Clock3,
  Users,
} from 'lucide-react';

import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { P } from '@/lib/permissions';
import type {
  Patient,
  ReadmissionForecast,
  RiskCategory,
  RiskPrediction,
} from '@/types';
import {
  EmptyState,
  ErrorState,
  FormField,
  KpiCard,
  PageHeader,
  RiskLegend,
  RiskPill,
  SectionCard,
  SubmitButton,
  SuccessNotice,
  TableSkeleton,
  formatDate,
  riskPercent,
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

const HORIZONS = [30, 60, 90];

export default function RiskPage() {
  const { token, permissions } = useAuth();

  const individual = permissions.includes(P.risk);
  const aggregated = permissions.includes(P.riskAggregated);
  const canForecast = permissions.includes(P.forecast);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [scores, setScores] = useState<RiskPrediction[]>([]);
  const [high, setHigh] = useState<RiskPrediction[]>([]);
  const [forecast, setForecast] = useState<ReadmissionForecast | null>(null);
  const [horizon, setHorizon] = useState(30);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState<RiskPrediction | null>(null);
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    patient_id: '',
    time_in_hospital: '5',
    num_medications: '10',
    num_lab_procedures: '30',
    number_diagnoses: '5',
    number_inpatient: '0',
    number_emergency: '0',
    age_group: '50-60',
  });

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      if (canForecast) {
        const forecastData = await apiFetch<ReadmissionForecast>(
          `/risk/forecast?horizon_days=${horizon}`,
          {},
          token,
        );

        setForecast(forecastData);
      } else {
        setForecast(null);
      }

      if (individual) {
        const [scoreData, highRiskData] = await Promise.all([
          apiFetch<RiskPrediction[]>('/risk/scores', {}, token),
          apiFetch<RiskPrediction[]>('/risk/high-risk', {}, token),
        ]);

        setScores(scoreData);
        setHigh(highRiskData);
      } else if (aggregated) {
        const distribution = await apiFetch<{
          current_distribution: {
            risk_category: string;
            count: number;
          }[];
        }>('/analytics/readmissions', {}, token);

        const pseudoScores = distribution.current_distribution.flatMap(
          (item) =>
            Array.from({ length: item.count }, (_, index) => ({
              patient_id: -index - 1,
              readmission_probability: 0,
              risk_category: item.risk_category as RiskCategory,
              model_name: 'Aggregated',
              model_version: '',
              risk_factors: [],
            })),
        );

        setScores(pseudoScores);
        setHigh([]);
      } else {
        setScores([]);
        setHigh([]);
      }
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not load risk data.',
      );
    } finally {
      setLoading(false);
    }
  }, [token, horizon, individual, aggregated, canForecast]);

  useEffect(() => {
    if (token) {
      void load();
    }
  }, [token, load]);

  useEffect(() => {
    if (!token || !individual) return;

    apiFetch<Patient[]>('/patients', {}, token)
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [token, individual]);

  const distribution = useMemo(
    () => ({
      low: scores.filter((item) => item.risk_category === 'low').length,
      medium: scores.filter((item) => item.risk_category === 'medium').length,
      high: scores.filter((item) => item.risk_category === 'high').length,
    }),
    [scores],
  );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!token) return;

    setBusy(true);
    setSuccess('');
    setError('');

    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [
          key,
          key === 'patient_id'
            ? Number(value)
            : [
                  'time_in_hospital',
                  'num_medications',
                  'num_lab_procedures',
                  'number_diagnoses',
                  'number_inpatient',
                  'number_emergency',
                ].includes(key)
              ? Number(value)
              : value,
        ]),
      );

      const result = await apiFetch<RiskPrediction>(
        '/risk/predict',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        token,
      );

      setAssessment(result);
      setSuccess(
        `Risk assessment completed for patient #${result.patient_id}.`,
      );

      await load();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not score this patient. Check the entered values.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Risk intelligence"
        title="Risk & readmission forecast"
        description={
          individual
            ? 'Score an admission, monitor latest patient risk, and review the aggregate readmission forecast.'
            : 'Review hospital-level readmission risk and forecast information available to your role.'
        }
        actions={
          <div className="flex items-center gap-2">
            <RiskLegend />
          </div>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorState message={error} onRetry={() => void load()} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={individual ? 'Patients scored' : 'Risk distribution'}
          value={individual ? (loading ? '—' : scores.length) : 'Aggregated'}
          icon={<Users className="h-5 w-5" />}
        />

        <KpiCard
          label="High-risk patients"
          value={individual ? (loading ? '—' : high.length) : '—'}
          detail={
            individual ? 'Latest scores' : 'Not exposed individually'
          }
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="red"
        />

        <KpiCard
          label="Expected readmissions"
          value={
            canForecast
              ? loading
                ? '—'
                : (forecast?.predicted_readmissions ?? 0)
              : '—'
          }
          detail={
            canForecast && forecast
              ? `${forecast.horizon_days}-day horizon`
              : 'Forecast access not granted'
          }
          icon={<Calculator className="h-5 w-5" />}
          accent="teal"
        />

        <KpiCard
          label="Predicted rate"
          value={
            canForecast
              ? loading
                ? '—'
                : riskPercent(forecast?.predicted_rate ?? 0)
              : '—'
          }
          detail={
            canForecast
              ? 'Probability-weighted estimate'
              : 'Forecast access not granted'
          }
          icon={<Clock3 className="h-5 w-5" />}
          accent="amber"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <SectionCard
          title="Readmission forecast"
          description="The backend forecast scales the latest 30-day risk estimate to the selected horizon."
          actions={
            canForecast ? (
              <select
                aria-label="Forecast horizon"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="field w-auto py-2 text-xs"
              >
                {HORIZONS.map((value) => (
                  <option key={value} value={value}>
                    {value} days
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-slate-400">
                Not available for this role
              </span>
            )
          }
        >
          {canForecast ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Horizon</p>
                <p className="mt-1 text-xl font-bold">
                  {forecast?.horizon_days ?? '—'} days
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Expected cases</p>
                <p className="mt-1 text-xl font-bold">
                  {forecast?.predicted_readmissions ?? '—'}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Predicted rate</p>
                <p className="mt-1 text-xl font-bold">
                  {forecast
                    ? riskPercent(forecast.predicted_rate)
                    : '—'}
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Forecast access not granted"
              message="This role can review aggregated risk analytics without the readmission forecast endpoint."
            />
          )}

          <div className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50/50 p-4 text-xs leading-5 text-slate-600">
            This is a model-based estimate, not a time-series clinical
            forecast. Review the backend methodology and current patient
            context before acting on it.
          </div>
        </SectionCard>

        <SectionCard
          title="Latest risk distribution"
          description="Latest score per visible patient when individual risk access is available."
        >
          {!individual ? (
            <EmptyState
              title="Aggregated view"
              message="Individual patient scores are restricted for this role. Use the hospital analytics view for population-level risk distributions."
            />
          ) : loading ? (
            <TableSkeleton columns={3} rows={3} />
          ) : (
            <div className="space-y-4">
              {(['high', 'medium', 'low'] as RiskCategory[]).map(
                (category) => {
                  const count = distribution[category];
                  const total = scores.length || 1;
                  const percentage = (count / total) * 100;

                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between">
                        <RiskPill category={category} />

                        <span className="text-xs font-semibold text-slate-600">
                          {count} · {Math.round(percentage)}%
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            category === 'high'
                              ? 'bg-risk-high'
                              : category === 'medium'
                                ? 'bg-risk-medium'
                                : 'bg-risk-low'
                          }`}
                          style={{
                            width: `${Math.max(2, percentage)}%`,
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

      {individual && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <SectionCard
            title="Score an admission"
            description="Enter the feature values required by the current risk model."
          >
            {success && (
              <div className="mb-4">
                <SuccessNotice message={success} />
              </div>
            )}

            <form
              onSubmit={submit}
              className="grid gap-4 sm:grid-cols-2"
            >
              <FormField
                label="Patient"
                htmlFor="patient_id"
                error={!form.patient_id ? '' : undefined}
              >
                <select
                  id="patient_id"
                  required
                  value={form.patient_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      patient_id: e.target.value,
                    })
                  }
                  className="field mt-1.5"
                >
                  <option value="">Select patient</option>

                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.medical_record_number} ·{' '}
                      {patient.primary_diagnosis ?? 'No diagnosis'}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Age group" htmlFor="age_group">
                <select
                  id="age_group"
                  value={form.age_group}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      age_group: e.target.value,
                    })
                  }
                  className="field mt-1.5"
                >
                  {AGE.map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
                </select>
              </FormField>

              {[
                ['time_in_hospital', 'Length of stay', 1, 14],
                ['num_medications', 'Medications', 0, 999],
                ['num_lab_procedures', 'Lab procedures', 0, 999],
                ['number_diagnoses', 'Diagnoses', 0, 999],
                ['number_inpatient', 'Prior inpatient visits', 0, 999],
                ['number_emergency', 'Prior emergency visits', 0, 999],
              ].map(([fieldId, label, min, max]) => (
                <FormField
                  key={String(fieldId)}
                  label={String(label)}
                  htmlFor={String(fieldId)}
                >
                  <input
                    id={String(fieldId)}
                    required
                    type="number"
                    min={Number(min)}
                    max={Number(max)}
                    value={String(
                      form[fieldId as keyof typeof form],
                    )}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [fieldId]: e.target.value,
                      })
                    }
                    className="field mt-1.5"
                  />
                </FormField>
              ))}

              <div className="flex justify-end sm:col-span-2">
                <SubmitButton loading={busy}>
                  Run risk assessment
                </SubmitButton>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Latest assessment"
            description="Model metadata and rule-based explanation from the submitted features."
          >
            {!assessment ? (
              <EmptyState
                title="No assessment yet"
                message="Run an assessment to see the probability, category, model version and contributing factors."
                icon={<BrainCircuit className="h-5 w-5" />}
              />
            ) : (
              <div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Readmission probability
                    </p>

                    <p className="mt-1 text-3xl font-bold text-navy-950">
                      {riskPercent(
                        assessment.readmission_probability,
                      )}
                    </p>
                  </div>

                  <RiskPill category={assessment.risk_category} />
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-y-3 text-xs">
                  <dt className="text-slate-500">Model</dt>
                  <dd className="text-right font-semibold">
                    {assessment.model_name}
                  </dd>

                  <dt className="text-slate-500">Version</dt>
                  <dd className="text-right font-semibold">
                    {assessment.model_version}
                  </dd>

                  <dt className="text-slate-500">Updated</dt>
                  <dd className="text-right">
                    {formatDate(assessment.created_at)}
                  </dd>
                </dl>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-700">
                    Contributing factors
                  </p>

                  <ul className="mt-2 space-y-2 text-xs leading-5 text-slate-600">
                    {assessment.risk_factors.map((factor, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-clinical-600">•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-4 text-[11px] leading-5 text-slate-400">
                    These factors are rule-based explanations of
                    submitted inputs, not model-derived feature
                    importance.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      <SectionCard
        title="High-risk monitoring"
        description="Patients whose latest score is at or above the backend high-risk threshold."
        className="mt-6"
      >
        {!individual ? (
          <EmptyState
            title="Individual alerts are restricted"
            message="Your role has aggregated risk access. No patient identifiers are shown here."
          />
        ) : loading ? (
          <TableSkeleton columns={4} rows={5} />
        ) : high.length === 0 ? (
          <EmptyState
            title="No high-risk patients"
            message="No visible patient has a latest score in the high-risk band."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="pb-3">Patient</th>
                  <th className="pb-3">Risk</th>
                  <th className="pb-3">Model</th>
                  <th className="pb-3">Updated</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {high.map((item) => (
                  <tr
                    key={`${item.patient_id}-${item.created_at}`}
                  >
                    <td className="py-3 font-semibold">
                      Patient #{item.patient_id}
                    </td>

                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <RiskPill category={item.risk_category} />
                        <span className="font-mono text-xs">
                          {riskPercent(
                            item.readmission_probability,
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 text-xs text-slate-500">
                      {item.model_name} · {item.model_version}
                    </td>

                    <td className="py-3 text-xs text-slate-500">
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}