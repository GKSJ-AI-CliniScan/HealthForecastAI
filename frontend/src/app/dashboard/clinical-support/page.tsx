'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldAlert, Stethoscope } from 'lucide-react';

import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { P } from '@/lib/permissions';
import type { DischargePlan, Patient } from '@/types';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SectionCard,
} from '@/components/ui';

export default function ClinicalSupport() {
  const { token, permissions } = useAuth();

  const allowed = permissions.includes(P.cds);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [id, setId] = useState('');
  const [recs, setRecs] = useState<string[] | null>(null);
  const [plan, setPlan] = useState<DischargePlan | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !allowed) {
      setLoadingPatients(false);
      return;
    }

    setLoadingPatients(true);

    apiFetch<Patient[]>('/patients', {}, token)
      .then(setPatients)
      .catch((e) =>
        setError(
          e instanceof ApiError
            ? e.message
            : 'Could not load visible patients.',
        ),
      )
      .finally(() => setLoadingPatients(false));
  }, [token, allowed]);

  async function run() {
    if (!token || !id) return;

    setLoading(true);
    setError('');
    setRecs(null);
    setPlan(null);

    try {
      const [recommendations, dischargePlan] = await Promise.all([
        apiFetch<string[]>(
          `/clinical-support/recommendations/${id}`,
          {},
          token,
        ),
        apiFetch<DischargePlan>(
          `/clinical-support/discharge-plan/${id}`,
          {},
          token,
        ),
      ]);

      setRecs(recommendations);
      setPlan(dischargePlan);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not load clinical support. Check that the selected patient has a stored risk assessment and that the backend returned a valid response.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (!allowed) {
    return (
      <div>
        <PageHeader
          eyebrow="Clinical support"
          title="Clinical decision support"
          description="This workspace is limited to roles with care_recommendation:generate."
        />

        <SectionCard>
          <EmptyState
            title="Clinical support is not enabled for this role"
            message="No clinical-support actions are rendered because the current account lacks the required permission."
            icon={<ShieldAlert className="h-5 w-5" />}
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Clinical support"
        title="Care recommendations"
        description="Rule-based follow-up and discharge guidance generated from the selected patient’s latest stored risk assessment."
      />

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
        <strong>Decision-support notice:</strong> These recommendations are
        rule-based guidance, not a definitive diagnosis or treatment plan.
        Review them with the patient’s clinical context.
      </div>

      {error && (
        <div className="mb-5">
          <ErrorState message={error} />
        </div>
      )}

      <SectionCard
        title="Select a visible patient"
        description="Patient choices are sourced only from the role-scoped /patients response."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="patient"
              className="text-xs font-semibold text-slate-700"
            >
              Patient
            </label>

            <select
              id="patient"
              disabled={loadingPatients || loading}
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="field mt-1.5"
            >
              <option value="">
                {loadingPatients
                  ? 'Loading visible patients…'
                  : 'Select patient'}
              </option>

              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.medical_record_number} ·{' '}
                  {patient.primary_diagnosis ?? 'No diagnosis'}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={loading || !id}
            onClick={run}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Generate guidance'}
          </button>
        </div>
      </SectionCard>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Care recommendations"
          description="Generated from the latest stored risk score."
        >
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-16 rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : !recs ? (
            <EmptyState
              title="No guidance generated"
              message="Select a patient and generate decision-support guidance."
              icon={<Stethoscope className="h-5 w-5" />}
            />
          ) : (
            <div className="space-y-3">
              {recs.map((recommendation, index) => (
                <div
                  key={index}
                  className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="mt-0.5 rounded-full bg-cyan-50 p-1.5 text-clinical-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>

                  <p className="text-sm leading-6 text-slate-700">
                    {recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Discharge plan"
          description="Monitoring requirement returned by the backend."
        >
          {!plan ? (
            <EmptyState
              title="Plan not available"
              message="A discharge plan will appear after guidance is generated."
            />
          ) : (
            <div>
              <div
                className={`rounded-xl border p-4 ${
                  plan.requires_close_monitoring
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-emerald-200 bg-emerald-50'
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide">
                  Monitoring status
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {plan.requires_close_monitoring
                    ? 'Close monitoring recommended'
                    : 'Standard monitoring'}
                </p>
              </div>

              <ul className="mt-5 space-y-3">
                {plan.recommendations.map((recommendation, index) => (
                  <li
                    key={index}
                    className="text-sm leading-6 text-slate-600"
                  >
                    <span className="mr-2 font-bold text-clinical-600">
                      {index + 1}.
                    </span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}