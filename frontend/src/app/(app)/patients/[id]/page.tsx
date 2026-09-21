'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { KpiCard } from '@/components/ui/KpiCard';
import { RiskBadge, RiskMeter } from '@/components/ui/RiskBadge';
import { EmptyBlock, ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import type { CareRecommendationsResponse, DischargePlanResponse, PatientDetail, PatientRiskScore } from '@/types';

const READMISSION_LABEL: Record<string, string> = {
  '<30': 'Readmitted within 30 days',
  '>30': 'Readmitted after 30 days',
  NO: 'Not readmitted',
};

const CARE_PATHWAY_STAGES = [
  { id: 1, name: 'Admission & Triage', status: 'completed' },
  { id: 2, name: 'AI Risk Stratification', status: 'completed' },
  { id: 3, name: 'Therapy Protocol', status: 'completed' },
  { id: 4, name: 'Recovery Scoring', status: 'completed' },
  { id: 5, name: 'Medication Reconciliation', status: 'in-progress' },
  { id: 6, name: 'Discharge Readiness', status: 'pending' },
  { id: 7, name: '30d Surveillance', status: 'pending' },
];

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, loading } = useApi<PatientDetail>(`/patients/${params.id}`);
  const risk = useApi<PatientRiskScore>(`/risk/patients/${params.id}`);
  const cdsRecs = useApi<CareRecommendationsResponse>(`/clinical-support/recommendations/${params.id}`);
  const discharge = useApi<DischargePlanResponse>(`/clinical-support/discharge-plan/${params.id}`);

  // Interactive Checklist State for CDS & Discharge
  const [completedCds, setCompletedCds] = useState<Record<number, boolean>>({});
  const [dischargeChecklist, setDischargeChecklist] = useState<Record<string, boolean>>({
    'Vital signs stable for 24 hours': true,
    'Medication reconciliation complete': true,
    'Follow-up appointment scheduled': false,
    'Patient education materials handed over': true,
    'Prescription supply verified (30-day)': true,
  });
  const [physicianApproved, setPhysicianApproved] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBlock
          message={
            error.includes('not found')
              ? 'This patient is not in your caseload.'
              : error
          }
        />
        <Link href="/patients" className="btn-ghost">
          Back to patients
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const readmitted30 = data.admissions.filter((a) => a.readmitted === '<30').length;
  const averageStay =
    data.admissions.length > 0
      ? (
          data.admissions.reduce((sum, a) => sum + (a.time_in_hospital ?? 0), 0) /
          data.admissions.length
        ).toFixed(1)
      : '—';

  // Toggle CDS Recommendation
  const toggleCds = (idx: number) => {
    setCompletedCds((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Toggle Discharge Checklist
  const toggleDischargeItem = (key: string) => {
    setDischargeChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Calculate dynamic readiness score
  const totalItems = Object.keys(dischargeChecklist).length;
  const completedItems = Object.values(dischargeChecklist).filter(Boolean).length;
  const dynamicReadinessScore = Math.round((completedItems / (totalItems || 1)) * 100);
  const isReady = dynamicReadinessScore >= 80;

  return (
    <div className="space-y-8">
      {/* Header with Navigation */}
      <header className="border-b pb-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/patients" className="muted text-xs hover:underline">
              ← Back to Patients Registry
            </Link>
            <div className="flex items-center gap-3 mt-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {data.medical_record_number}
              </h1>
              {risk.data && <RiskBadge category={risk.data.risk_category} />}
            </div>
            <p className="muted mt-1 text-sm">
              {[data.age_group, data.gender, data.race].filter(Boolean).join(' · ') ||
                'No demographics recorded'}
              {data.primary_diagnosis ? ` · ${data.primary_diagnosis}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDischargeModal(true)}
              className="btn text-xs font-semibold"
            >
              📄 View Discharge Plan
            </button>
          </div>
        </div>

        {/* Care Pathway Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Clinical Care Pathway Workflow</span>
            <span className="muted">Stage 5 of 7: Inpatient Management & Discharge Evaluation</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {CARE_PATHWAY_STAGES.map((stage) => (
              <div
                key={stage.id}
                className={`rounded py-1.5 px-2 text-center text-[10px] font-semibold border transition ${
                  stage.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
                    : stage.status === 'in-progress'
                    ? 'bg-blue-100 text-blue-800 border-blue-400 dark:bg-blue-950 dark:text-blue-200 animate-pulse'
                    : 'bg-surface-muted text-muted border-border'
                }`}
              >
                {stage.id}. {stage.name}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Top Telemetry KPIs */}
      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Admissions" value={data.admissions.length} />
        <KpiCard
          label="30-day readmissions"
          value={readmitted30}
          tone={readmitted30 > 0 ? 'warn' : 'good'}
        />
        <KpiCard label="Average stay" value={`${averageStay} days`} />
      </section>

      {/* AI Risk Stratification Panel */}
      {risk.data ? (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">30-day readmission risk stratification</h2>
              <p className="muted mt-1 text-sm">
                {risk.data.model_name} v{risk.data.model_version}
                {risk.data.flagged ? ' · flagged for clinical intervention' : ' · below review threshold'}
              </p>
            </div>
            <RiskBadge category={risk.data.risk_category} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-6">
            <div>
              <p className="muted text-xs font-semibold uppercase tracking-wide">
                Readmission Probability
              </p>
              <p className="mt-1 text-3xl font-bold text-foreground">
                {(risk.data.readmission_probability * 100).toFixed(1)}%
              </p>
            </div>
            <div className="min-w-40 flex-1 max-w-xs">
              <p className="muted text-xs font-semibold uppercase tracking-wide">
                Cohort Risk Index
              </p>
              <div className="mt-2">
                <RiskMeter probability={risk.data.readmission_probability} />
              </div>
            </div>
            <div>
              <p className="muted text-xs font-semibold uppercase tracking-wide">
                Clinical Decision Cutoff
              </p>
              <p className="mt-1 text-sm font-mono font-semibold">
                t = {(risk.data.decision_threshold * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* CDS Care Recommendations Checklist */}
      {cdsRecs.data && cdsRecs.data.recommendations.length > 0 ? (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h2 className="text-lg font-semibold">Clinical Decision Support (CDS) Recommendations</h2>
              <p className="muted text-xs">
                AI-driven care protocols derived from risk drivers, comorbidities, and admission telemetry
              </p>
            </div>
            {cdsRecs.data.follow_up_days ? (
              <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                Recommended Follow-Up Window: {cdsRecs.data.follow_up_days} Days
              </span>
            ) : null}
          </div>

          <ul className="space-y-2">
            {cdsRecs.data.recommendations.map((rec: string, idx: number) => {
              const isChecked = !!completedCds[idx];
              return (
                <li
                  key={idx}
                  onClick={() => toggleCds(idx)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-xs cursor-pointer transition ${
                    isChecked
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-surface-muted hover:bg-surface-muted/80 border-border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-0.5 rounded accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className={isChecked ? 'line-through text-muted' : 'font-medium text-foreground'}>
                      {rec}
                    </span>
                  </div>
                  {isChecked && (
                    <span className="text-emerald-600 font-bold text-[10px] uppercase">
                      ✓ Implemented
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Discharge Readiness Protocol & Assessment */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-lg font-semibold">Discharge Readiness Protocol & Verification</h2>
            <p className="muted text-xs">
              Interactive readiness checklist and physician discharge sign-off
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold">
              Readiness Score: <strong className="text-blue-600 text-sm">{dynamicReadinessScore}/100</strong>
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isReady
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
              }`}
            >
              {isReady ? 'Ready for Discharge' : 'Review Required Before Discharge'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide muted">Clinical Verification Checklist</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(dischargeChecklist).map(([item, checked]) => (
              <label
                key={item}
                className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-surface text-xs cursor-pointer hover:bg-surface-muted transition"
                style={{ borderColor: 'var(--border)' }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDischargeItem(item)}
                  className="rounded accent-emerald-600 cursor-pointer"
                />
                <span className={checked ? 'font-medium text-foreground' : 'text-muted'}>{item}</span>
              </label>
            ))}
          </div>
        </div>

        {discharge.data?.risk_mitigation && discharge.data.risk_mitigation.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide muted mb-2">
              Mandatory Risk Mitigation Steps
            </p>
            <ul className="space-y-1.5">
              {discharge.data.risk_mitigation.map((step: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-xs">
                  <span className="text-amber-600 font-bold">✔</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
          <div>
            {physicianApproved ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <span>✓</span> Clinical Discharge Clearance Approved
              </span>
            ) : (
              <span className="text-xs muted">Attending physician approval pending</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setPhysicianApproved(!physicianApproved)}
            className={`btn text-xs font-semibold ${
              physicianApproved ? 'bg-emerald-600 hover:bg-emerald-700' : ''
            }`}
          >
            {physicianApproved ? '✓ Discharge Approved' : 'Sign-Off Discharge Clearance'}
          </button>
        </div>
      </section>

      {/* Clinical Summary */}
      <section className="card">
        <h2 className="text-lg font-semibold">Clinical summary</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="muted text-xs font-semibold uppercase tracking-wide">
              Primary diagnosis group
            </dt>
            <dd className="mt-1 text-sm font-medium">{data.primary_diagnosis ?? '—'}</dd>
          </div>
          <div>
            <dt className="muted text-xs font-semibold uppercase tracking-wide">
              Assigned doctor
            </dt>
            <dd className="mt-1 text-sm">
              {data.assigned_doctor_id ? `Physician #${data.assigned_doctor_id}` : 'Unassigned'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Admission History Table */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Admission history</h2>
        {data.admissions.length === 0 ? (
          <EmptyBlock message="No admissions recorded for this patient." />
        ) : (
          <div className="table-wrap">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">Type</th>
                  <th className="th">Stay (days)</th>
                  <th className="th">Medications</th>
                  <th className="th">Lab procedures</th>
                  <th className="th">Diagnoses</th>
                  <th className="th">Discharge</th>
                  <th className="th">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.admissions.map((admission) => (
                  <tr key={admission.id}>
                    <td className="td font-medium">{admission.admission_type ?? '—'}</td>
                    <td className="td">{admission.time_in_hospital ?? '—'}</td>
                    <td className="td">{admission.num_medications ?? '—'}</td>
                    <td className="td">{admission.num_lab_procedures ?? '—'}</td>
                    <td className="td">{admission.number_diagnoses ?? '—'}</td>
                    <td className="td">{admission.discharge_disposition ?? '—'}</td>
                    <td className="td">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          background:
                            admission.readmitted === '<30' ? '#fdecea' : 'var(--surface-muted)',
                          color:
                            admission.readmitted === '<30' ? '#8a1c12' : 'var(--muted)',
                        }}
                      >
                        {READMISSION_LABEL[admission.readmitted ?? ''] ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Discharge Plan Modal */}
      {showDischargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg space-y-4 bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <span className="text-xs font-mono muted">ST. JUDE MEDICAL CENTER</span>
                <h3 className="text-lg font-bold">Patient Discharge & Risk Management Plan</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDischargeModal(false)}
                className="btn-ghost text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="rounded-lg border p-3 bg-surface-muted space-y-1">
                <p><strong>Patient MRN:</strong> {data.medical_record_number}</p>
                <p><strong>Diagnosis:</strong> {data.primary_diagnosis}</p>
                <p><strong>Readmission Risk Category:</strong> {risk.data?.risk_category.toUpperCase() || 'LOW'}</p>
                <p><strong>Readiness Score:</strong> {dynamicReadinessScore} / 100</p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-foreground">Post-Discharge Instructions:</p>
                <p>1. Attend scheduled outpatient telehealth check within <strong>{cdsRecs.data?.follow_up_days || 14} days</strong>.</p>
                <p>2. Maintain glycemic log and adhere strictly to titrated medication regimen.</p>
                <p>3. Report any acute shortness of breath or dizziness immediately via emergency hotline.</p>
              </div>

              <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <span className="text-emerald-600 font-semibold text-xs">
                  {physicianApproved ? '✓ Clearance Signed' : 'Approval Recorded'}
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn text-xs font-semibold"
                >
                  🖨️ Print Discharge Sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
