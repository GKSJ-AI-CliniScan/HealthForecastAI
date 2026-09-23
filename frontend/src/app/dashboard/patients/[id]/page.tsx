import Link from 'next/link';

import RiskScoreBar from '@/components/charts/RiskScoreBar';
import ForecastReadmissionButton from '@/components/risk/ForecastReadmissionButton';
import ScoreRiskButton from '@/components/risk/ScoreRiskButton';
import { Badge, Card, Cell, ErrorNote, Row, StatTile, Table } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { can, getToken, requireUser } from '@/lib/session';
import type { CareRecommendations, DischargePlan, Patient, RiskPrediction } from '@/types';

export const dynamic = 'force-dynamic';

interface Admission {
  id: number;
  patient_id: number;
  admission_date: string | null;
  discharge_date: string | null;
  time_in_hospital: number | null;
  admission_type: string | null;
  discharge_disposition: string | null;
  num_medications: number | null;
  readmitted: string | null;
}

interface ReadmissionSummary {
  patient_id: number;
  total_admissions: number;
  readmitted_total: number;
  by_label: Record<string, number>;
}

/**
 * Patient detail: demographics, readmission tracking and the admission timeline.
 *
 * A patient outside the caller's scope returns 404 from the backend, and this
 * page shows that as "not found" rather than as a permission error - matching the
 * backend's decision not to confirm that such a record exists.
 */
export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const token = await getToken();
  const { id } = await params;

  let patient: Patient | null = null;
  let admissions: Admission[] = [];
  let summary: ReadmissionSummary | null = null;

  try {
    patient = await apiFetch<Patient>(`/patients/${id}`, { cache: 'no-store' }, token);
    admissions = await apiFetch<Admission[]>(
      `/patients/${id}/admissions`,
      { cache: 'no-store' },
      token,
    );
    summary = await apiFetch<ReadmissionSummary>(
      `/patients/${id}/admissions/readmissions`,
      { cache: 'no-store' },
      token,
    );
  } catch {
    patient = null;
  }

  if (!patient) {
    return (
      <div className="space-y-4">
        <ErrorNote>That patient is not available to you.</ErrorNote>
        <Link href="/dashboard/patients" className="text-sm underline underline-offset-2">
          Back to patients
        </Link>
      </div>
    );
  }

  // Risk scoring, readmission forecasting and CDS are Doctor + System
  // Administrator only today (RISK_REPORT_READ / CARE_RECOMMENDATION_GENERATE
  // in backend/app/core/rbac.py) - Hospital Administrator and Healthcare
  // Researcher have no per-patient prediction endpoint yet, so this section is
  // skipped for them rather than shown failing, matching the aggregate-only
  // view those roles get elsewhere.
  const canSeeRisk = can(user, 'risk_report:read');
  const mostRecentAdmission = admissions[0] ?? null;

  let riskScore: RiskPrediction | null = null;
  let readmissionForecast: RiskPrediction | null = null;
  let recommendations: CareRecommendations | null = null;
  let dischargePlan: DischargePlan | null = null;

  if (canSeeRisk) {
    [riskScore, readmissionForecast, recommendations, dischargePlan] = await Promise.all([
      apiFetch<RiskPrediction>(`/risk/${id}`, { cache: 'no-store' }, token).catch(() => null),
      apiFetch<RiskPrediction>(
        `/risk/${id}?type=readmission`,
        { cache: 'no-store' },
        token,
      ).catch(() => null),
      apiFetch<CareRecommendations>(
        `/clinical-support/recommendations/${id}`,
        { cache: 'no-store' },
        token,
      ).catch(() => null),
      apiFetch<DischargePlan>(
        `/clinical-support/discharge-plan/${id}`,
        { cache: 'no-store' },
        token,
      ).catch(() => null),
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{patient.medical_record_number}</h1>
          <p className="mt-1 text-sm opacity-70">
            De-identified record. No name, address or date of birth is stored.
          </p>
        </div>
        <Link href="/dashboard/patients" className="text-sm underline underline-offset-2">
          Back to patients
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Admissions" value={summary?.total_admissions ?? admissions.length} />
        <StatTile label="Readmissions" value={summary?.readmitted_total ?? 0} />
        <StatTile label="Age group" value={patient.age_group ?? '-'} />
      </div>

      <Card title="Demographics">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="opacity-60">Gender</dt>
            <dd>{patient.gender ?? '-'}</dd>
          </div>
          <div>
            <dt className="opacity-60">Primary diagnosis</dt>
            <dd>{patient.primary_diagnosis ?? '-'}</dd>
          </div>
          <div>
            <dt className="opacity-60">Assigned doctor</dt>
            <dd>{patient.assigned_doctor_id ?? 'Unassigned'}</dd>
          </div>
        </dl>
      </Card>

      {summary && Object.keys(summary.by_label).length > 0 && (
        <Card title="Readmission outcomes">
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.by_label).map(([label, count]) => (
              <Badge key={label}>
                {label}: {count}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {canSeeRisk && (
        <Card title="Risk & recommendations">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium opacity-80">Patient risk score</h3>
                <ScoreRiskButton patientId={patient.id} />
              </div>
              {riskScore ? (
                <div className="space-y-2">
                  <RiskScoreBar
                    probability={riskScore.readmission_probability}
                    category={riskScore.risk_category}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge>{riskScore.risk_category.toUpperCase()}</Badge>
                    <span className="opacity-70">
                      {(riskScore.readmission_probability * 100).toFixed(0)}% probability
                    </span>
                  </div>
                  <p className="text-xs opacity-60">
                    {riskScore.model_name} v{riskScore.model_version}
                    {riskScore.created_at
                      ? ` · ${new Date(riskScore.created_at).toLocaleString()}`
                      : ''}
                  </p>
                </div>
              ) : (
                <p className="text-sm opacity-70">Not scored yet.</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium opacity-80">30-day readmission forecast</h3>
                {mostRecentAdmission && (
                  <ForecastReadmissionButton
                    patientId={patient.id}
                    admissionId={mostRecentAdmission.id}
                  />
                )}
              </div>
              {readmissionForecast ? (
                <div className="space-y-2">
                  <RiskScoreBar
                    probability={readmissionForecast.readmission_probability}
                    category={readmissionForecast.risk_category}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge>{readmissionForecast.risk_category.toUpperCase()}</Badge>
                    <span className="opacity-70">
                      {(readmissionForecast.readmission_probability * 100).toFixed(0)}% ·{' '}
                      {readmissionForecast.readmission_window ?? '30-day'} horizon
                    </span>
                  </div>
                  {readmissionForecast.confidence_score !== null && (
                    <p className="text-xs opacity-60">
                      Confidence: {(readmissionForecast.confidence_score * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm opacity-70">
                  {mostRecentAdmission
                    ? 'Not forecasted yet.'
                    : 'No admission recorded to forecast.'}
                </p>
              )}
            </div>
          </div>

          {recommendations && recommendations.recommendations.length > 0 && (
            <div className="mt-6 border-t border-[var(--border)] pt-4">
              <h3 className="text-sm font-medium opacity-80">Care & follow-up recommendations</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {recommendations.recommendations.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <Badge>{item.category}</Badge>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
              {recommendations.follow_up_days != null && (
                <p className="mt-2 text-xs opacity-60">
                  Suggested follow-up: within {recommendations.follow_up_days} days.
                </p>
              )}
            </div>
          )}

          {dischargePlan && (
            <div className="mt-6 border-t border-[var(--border)] pt-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium opacity-80">Discharge readiness</h3>
                <Badge>
                  {dischargePlan.ready_for_discharge === null
                    ? 'Unknown'
                    : dischargePlan.ready_for_discharge
                      ? 'Ready'
                      : 'Not ready'}
                </Badge>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {dischargePlan.discharge_checklist.map((item, index) => (
                  <li key={index}>• {item.text}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <Card title="Admission history">
        <Table
          headers={['Admitted', 'Discharged', 'Stay (days)', 'Type', 'Medications', 'Readmitted']}
          empty="No admissions recorded for this patient."
        >
          {admissions.map((admission) => (
            <Row key={admission.id}>
              <Cell>{admission.admission_date ?? '-'}</Cell>
              <Cell>{admission.discharge_date ?? '-'}</Cell>
              <Cell>{admission.time_in_hospital ?? '-'}</Cell>
              <Cell>{admission.admission_type ?? '-'}</Cell>
              <Cell>{admission.num_medications ?? '-'}</Cell>
              <Cell>{admission.readmitted ?? '-'}</Cell>
            </Row>
          ))}
        </Table>
      </Card>
    </div>
  );
}
