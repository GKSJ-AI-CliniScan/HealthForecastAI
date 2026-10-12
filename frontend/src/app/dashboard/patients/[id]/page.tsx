import Link from 'next/link';

import RiskScoreBar from '@/components/charts/RiskScoreBar';
import TrendLineChart from '@/components/charts/TrendLineChart';
import { PALETTE } from '@/components/charts/chartUtils';
import ForecastReadmissionButton from '@/components/risk/ForecastReadmissionButton';
import ScoreRiskButton from '@/components/risk/ScoreRiskButton';
import {
  Badge,
  Card,
  Cell,
  DefinitionList,
  ErrorNote,
  MetricStrip,
  PageHeader,
  RiskBadge,
  Row,
  StatTile,
  Table,
} from '@/components/ui';
import { SCORE_NOTES, ScoreNote, formatModelScore } from '@/components/ui/ModelDisclaimer';
import {
  formatDate,
  formatTimestamp,
  modelVersionLabel,
  readmissionLabel,
  windowLabel,
} from '@/components/ui/labels';
import { EmptyState, SectionError } from '@/components/ui/states';
import { assignedDoctorLabel, formatNumber, humanise } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import { can, getToken, requireUser } from '@/lib/session';
import type {
  Admission,
  CareRecommendations,
  DischargePlan,
  Patient,
  ReadmissionSummary,
  RiskPrediction,
  TreatmentOutcome,
} from '@/types';

export const dynamic = 'force-dynamic';

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
        <SectionError
          error={{ kind: 'not_found', status: 404, message: 'That patient is not available to you.' }}
        />
        <Link href="/dashboard/patients" className="btn btn-secondary btn-sm">
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

  // Prediction history is readable by any role holding either prediction
  // permission (backend _read_risk_or_readmission), which includes Hospital
  // Administrators - wider than the scoring/CDS actions above.
  const canReadPredictions = canSeeRisk || can(user, 'readmission_forecast:read');
  const [riskHistory, forecastHistory, treatmentLists] = await Promise.all([
    canReadPredictions
      ? apiFetch<RiskPrediction[]>(`/risk/${id}/history`, { cache: 'no-store' }, token).catch(
          () => null,
        )
      : Promise.resolve(null),
    canReadPredictions
      ? apiFetch<RiskPrediction[]>(
          `/risk/${id}/history?type=readmission`,
          { cache: 'no-store' },
          token,
        ).catch(() => null)
      : Promise.resolve(null),
    Promise.all(
      admissions.map((admission) =>
        apiFetch<TreatmentOutcome[]>(
          `/patients/${id}/admissions/${admission.id}/treatments`,
          { cache: 'no-store' },
          token,
        ).catch(() => null),
      ),
    ),
  ]);

  const treatmentsFailed = treatmentLists.some((list) => list === null);
  const treatments = admissions.flatMap((admission, index) =>
    (treatmentLists[index] ?? []).map((outcome) => ({ admission, outcome })),
  );
  const recoverySeries = [...new Set(treatments.map(({ outcome }) => outcome.treatment_name))];
  const recoveryRows = treatments
    .filter(({ admission, outcome }) => admission.discharge_date && outcome.recovery_score !== null)
    .sort((a, b) => (a.admission.discharge_date ?? '').localeCompare(b.admission.discharge_date ?? ''))
    .map(({ admission, outcome }) => ({
      date: admission.discharge_date,
      [outcome.treatment_name]: outcome.recovery_score,
    }));
  const predictionRows = [
    ...(riskHistory ?? []).map((row) => ({ at: row.created_at, risk: row.readmission_probability })),
    ...(forecastHistory ?? []).map((row) => ({
      at: row.created_at,
      forecast: row.readmission_probability,
    })),
  ]
    // Epoch ms on a true time axis: predictions made within the same minute
    // stay distinct points, with the exact time in the tooltip.
    .map((row) => ({ ...row, at: row.at ? Date.parse(row.at) : Number.NaN }))
    .filter((row) => Number.isFinite(row.at))
    .sort((a, b) => a.at - b.at);

  // Demographics share a row with the readmission history only when there is one.
  const hasHistory = !!summary && Object.keys(summary.by_label).length > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumb={[
          { label: 'Patients', href: '/dashboard/patients' },
          { label: patient.medical_record_number },
        ]}
        title={patient.medical_record_number}
        description="De-identified record. No name, address or date of birth is stored."
        actions={
          <Link href="/dashboard/patients" className="btn btn-secondary btn-sm">
            Back to patients
          </Link>
        }
      />

      <MetricStrip label="Patient summary">
        <StatTile
          variant="plain"
          label="Admissions"
          value={summary?.total_admissions ?? admissions.length}
        />
        <StatTile variant="plain" label="Readmissions" value={summary?.readmitted_total ?? 0} />
        <StatTile variant="plain" label="Age group" value={patient.age_group ?? '-'} />
      </MetricStrip>

      <div className={`grid gap-6 ${hasHistory ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}`}>
        <Card title="Demographics">
          <DefinitionList
            items={[
              { term: 'Gender', value: patient.gender ?? '-' },
              { term: 'Primary diagnosis', value: patient.primary_diagnosis ?? '-' },
              {
                term: 'Assigned doctor',
                value: assignedDoctorLabel(patient, user.profile?.id ?? null),
              },
            ]}
          />
        </Card>

        {summary && hasHistory && (
          <Card title="Readmission history">
            <ul className="space-y-2">
              {Object.entries(summary.by_label).map(([label, count]) => (
                <li
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-rule pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-ink" title={label}>
                    {readmissionLabel(label)}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-ink">{count}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {canSeeRisk && (
        <Card title="Risk & recommendations">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-rule">
            <div className="space-y-3 lg:pr-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-panel text-ink">Patient risk score</h3>
                <ScoreRiskButton patientId={patient.id} />
              </div>
              {riskScore ? (
                <div className="space-y-3">
                  <RiskScoreBar
                    probability={riskScore.readmission_probability}
                    category={riskScore.risk_category}
                  />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <RiskBadge category={riskScore.risk_category} />
                    <span className="text-[0.9375rem] font-semibold tabular-nums text-ink">
                      Model score {formatModelScore(riskScore.readmission_probability)}
                    </span>
                  </div>
                  <p
                    className="text-sm text-ink-muted"
                    title={`${riskScore.model_name} v${riskScore.model_version}`}
                  >
                    Model &ldquo;{riskScore.model_name}&rdquo;, {modelVersionLabel(riskScore.model_version)}
                    {riskScore.created_at && (
                      <>
                        <br />
                        Scored {formatTimestamp(riskScore.created_at)}
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">Not scored yet.</p>
              )}
              <div className="space-y-1.5">
                <ScoreNote>{SCORE_NOTES.riskScore}</ScoreNote>
                {riskScore && <ScoreNote>{SCORE_NOTES.bands}</ScoreNote>}
              </div>
            </div>

            <div className="space-y-3 border-t border-rule pt-8 lg:border-t-0 lg:pl-8 lg:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-panel text-ink">30-day readmission forecast</h3>
                {mostRecentAdmission && (
                  <ForecastReadmissionButton
                    patientId={patient.id}
                    admissionId={mostRecentAdmission.id}
                  />
                )}
              </div>
              {readmissionForecast ? (
                <div className="space-y-3">
                  <RiskScoreBar
                    probability={readmissionForecast.readmission_probability}
                    category={readmissionForecast.risk_category}
                  />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <RiskBadge category={readmissionForecast.risk_category} />
                    <span className="text-[0.9375rem] font-semibold tabular-nums text-ink">
                      Model score {formatModelScore(readmissionForecast.readmission_probability)}
                    </span>
                    <span className="text-sm text-ink-muted">
                      {windowLabel(readmissionForecast.readmission_window)} horizon
                    </span>
                  </div>
                  <p
                    className="text-sm text-ink-muted"
                    title={`${readmissionForecast.model_name} v${readmissionForecast.model_version}`}
                  >
                    Model &ldquo;{readmissionForecast.model_name}&rdquo;,{' '}
                    {modelVersionLabel(readmissionForecast.model_version)}
                    {readmissionForecast.created_at && (
                      <>
                        <br />
                        Scored {formatTimestamp(readmissionForecast.created_at)}
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  {mostRecentAdmission
                    ? 'Not forecasted yet.'
                    : 'No admission recorded to forecast.'}
                </p>
              )}
              <div className="space-y-1.5">
                <ScoreNote>{SCORE_NOTES.readmissionScore}</ScoreNote>
                {readmissionForecast && <ScoreNote>{SCORE_NOTES.bands}</ScoreNote>}
              </div>
            </div>
          </div>

          {((recommendations && recommendations.recommendations.length > 0) || dischargePlan) && (
            <div className="mt-8 grid gap-8 border-t border-rule pt-6 lg:grid-cols-2">
              {recommendations && recommendations.recommendations.length > 0 && (
                <div>
                  <h3 className="text-panel text-ink">Care & follow-up recommendations</h3>
                  <div className="mt-1">
                    <ScoreNote>{SCORE_NOTES.recommendations}</ScoreNote>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {recommendations.recommendations.map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Badge>{humanise(item.category)}</Badge>
                        <span className="text-ink">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                  {recommendations.follow_up_days != null && (
                    <p className="mt-4 text-sm text-ink-muted">
                      Suggested follow-up: within {recommendations.follow_up_days} days.
                    </p>
                  )}
                </div>
              )}

              {dischargePlan && (
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-panel text-ink">Discharge readiness</h3>
                    <Badge>
                      {dischargePlan.ready_for_discharge === null
                        ? 'Unknown'
                        : dischargePlan.ready_for_discharge
                          ? 'Ready'
                          : 'Not ready'}
                    </Badge>
                  </div>
                  <div className="mt-1">
                    <ScoreNote>{SCORE_NOTES.recommendations}</ScoreNote>
                  </div>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-ink marker:text-ink-muted">
                    {dischargePlan.discharge_checklist.map((item, index) => (
                      <li key={index}>{item.text}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {canReadPredictions && (
        <Card title="Risk history">
          {riskHistory === null && forecastHistory === null ? (
            <ErrorNote>Could not load the prediction history for this patient.</ErrorNote>
          ) : predictionRows.length === 0 ? (
            <EmptyState>No risk scores or readmission forecasts recorded yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              <TrendLineChart
                label="Experimental risk score and 30-day readmission score over time"
                data={predictionRows}
                xKey="at"
                xType="time"
                zones
                height={280}
                series={[
                  { key: 'risk', label: 'Risk score (experimental)', color: PALETTE[0] },
                  {
                    key: 'forecast',
                    label: '30-day readmission score (experimental)',
                    color: PALETTE[3],
                  },
                ]}
                valueFormat="decimal"
              />
              <ScoreNote>{SCORE_NOTES.history}</ScoreNote>
            </div>
          )}
        </Card>
      )}

      <Card title="Treatment outcomes">
        {treatmentsFailed && (
          <div className="mb-4">
            <ErrorNote>Some treatment outcomes could not be loaded.</ErrorNote>
          </div>
        )}
        {treatments.length === 0 ? (
          <EmptyState>No treatment outcomes recorded for this patient.</EmptyState>
        ) : (
          <div className="space-y-6">
            {recoveryRows.length > 0 && (
              <div>
                <h3 className="mb-3 text-panel text-ink">Recovery score by discharge date</h3>
                <TrendLineChart
                  label="Recovery score by discharge date"
                  data={recoveryRows}
                  xKey="date"
                  series={recoverySeries.map((name) => ({ key: name, label: name }))}
                  valueFormat="decimal"
                />
              </div>
            )}
            <Table
              headers={['Admitted', 'Treatment', 'Outcome', 'Recovery score', 'Medication change', 'Stay (days)']}
              numeric={[3, 5]}
            >
              {treatments.map(({ admission, outcome }) => (
                <Row key={outcome.id}>
                  <Cell>{formatDate(admission.admission_date)}</Cell>
                  <Cell>{outcome.treatment_name}</Cell>
                  <Cell>
                    <Badge>{outcome.outcome ? humanise(outcome.outcome) : 'Not recorded'}</Badge>
                  </Cell>
                  <Cell numeric>{formatNumber(outcome.recovery_score, 2)}</Cell>
                  <Cell>
                    {outcome.medication_change === null ? '-' : outcome.medication_change ? 'Yes' : 'No'}
                  </Cell>
                  <Cell numeric>{outcome.length_of_stay_days ?? '-'}</Cell>
                </Row>
              ))}
            </Table>
          </div>
        )}
      </Card>

      <Card title="Admission history">
        <Table
          headers={[
            'Admitted',
            'Discharged',
            'Department',
            'Stay (days)',
            'Type',
            'Medications',
            'Readmitted',
          ]}
          numeric={[3, 5]}
          empty="No admissions recorded for this patient."
        >
          {admissions.map((admission) => (
            <Row key={admission.id}>
              <Cell>{formatDate(admission.admission_date)}</Cell>
              <Cell>{formatDate(admission.discharge_date)}</Cell>
              <Cell>{admission.department ?? '-'}</Cell>
              <Cell numeric>{admission.time_in_hospital ?? '-'}</Cell>
              <Cell>{admission.admission_type ?? '-'}</Cell>
              <Cell numeric>{admission.num_medications ?? '-'}</Cell>
              <Cell>
                <span title={admission.readmitted ?? undefined}>
                  {readmissionLabel(admission.readmitted)}
                </span>
              </Cell>
            </Row>
          ))}
        </Table>
      </Card>
    </div>
  );
}
