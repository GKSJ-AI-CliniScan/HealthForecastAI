
'use client';

import Link from 'next/link';
import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
    type ReactNode,
} from 'react';

import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

import type {
    Patient,
    ReadmissionForecast,
    RiskDriversResponse,
    RiskPrediction,
} from '@/types';

const inputClass = 'hf-input';

export default function RiskPage() {
    const {
        token,
        currentUser,
        loading: authLoading,
        logout,
    } = useAuth();

    const [patients, setPatients] = useState<Patient[]>([]);
    const [highRiskPatients, setHighRiskPatients] = useState<RiskPrediction[]>([]);
    const [forecast, setForecast] = useState<ReadmissionForecast | null>(null);
    const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
    const [drivers, setDrivers] = useState<RiskDriversResponse | null>(null);

    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [timeInHospital, setTimeInHospital] = useState('4');
    const [numMedications, setNumMedications] = useState('10');
    const [numLabProcedures, setNumLabProcedures] = useState('40');
    const [numberDiagnoses, setNumberDiagnoses] = useState('5');
    const [numberInpatient, setNumberInpatient] = useState('0');
    const [numberEmergency, setNumberEmergency] = useState('0');

    const [loading, setLoading] = useState(false);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        if (!token) return;

        setDashboardLoading(true);

        try {
            setError('');

            const results = await Promise.allSettled([
                apiFetch<Patient[]>('/patients', {}, token),
                apiFetch<RiskPrediction[]>('/risk/high-risk', {}, token),
                apiFetch<ReadmissionForecast>(
                    '/risk/forecast?horizon_days=30',
                    {},
                    token,
                ),
            ]);

            const [patientResult, highRiskResult, forecastResult] = results;
            const failures: string[] = [];

            if (patientResult.status === 'fulfilled') {
                setPatients(patientResult.value);

                setSelectedPatientId((current) => {
                    if (current && patientResult.value.some(
                        (patient) => String(patient.id) === current,
                    )) {
                        return current;
                    }

                    return patientResult.value.length > 0
                        ? String(patientResult.value[0].id)
                        : '';
                });
            } else {
                failures.push(getRequestError(patientResult.reason, 'Patient list'));
            }

            if (highRiskResult.status === 'fulfilled') {
                setHighRiskPatients(highRiskResult.value);
            } else {
                failures.push(getRequestError(highRiskResult.reason, 'High-risk list'));
            }

            if (forecastResult.status === 'fulfilled') {
                setForecast(forecastResult.value);
            } else {
                failures.push(getRequestError(forecastResult.reason, 'Forecast'));
            }

            if (failures.length > 0) {
                setError(failures.join(' '));
            }
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : 'Unable to load the risk dashboard.',
            );
        } finally {
            setDashboardLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    async function handlePrediction(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!token || !selectedPatientId) {
            setError('Select a patient first.');
            return;
        }

        setLoading(true);
        setError('');
        setPrediction(null);
        setDrivers(null);

        const payload = {
            patient_id: Number(selectedPatientId),
            time_in_hospital: Number(timeInHospital),
            num_medications: Number(numMedications),
            num_lab_procedures: Number(numLabProcedures),
            number_diagnoses: Number(numberDiagnoses),
            number_inpatient: Number(numberInpatient),
            number_emergency: Number(numberEmergency),
        };

        try {
            const result = await apiFetch<RiskPrediction>(
                '/risk/predict',
                {
                    method: 'POST',
                    body: JSON.stringify(payload),
                },
                token,
            );

            setPrediction(result);

            const driverResult = await apiFetch<RiskDriversResponse>(
                '/risk/drivers',
                {
                    method: 'POST',
                    body: JSON.stringify(payload),
                },
                token,
            );

            setDrivers(driverResult);

            await loadDashboard();
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : 'Unable to calculate patient risk.',
            );
        } finally {
            setLoading(false);
        }
    }

    if (authLoading) {
        return <LoadingScreen text="Loading clinical workspace..." />;
    }

    if (!token || !currentUser) {
        return (
            <main className="hf-page flex min-h-screen items-center justify-center px-5">
                <div className="hf-panel w-full max-w-md p-8 text-center">
                    <BrandMark />
                    <h1 className="mt-5 text-xl font-semibold text-slate-900">
                        Sign in required
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Sign in to access patient risk prediction and readmission analytics.
                    </p>
                    <Link href="/" className="hf-button hf-button-primary mt-6">
                        Return to sign in
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="hf-page">
            <div className="hf-shell">
                <RiskSidebar />

                <div className="hf-main">
                    <header className="hf-header">
                        <div>
                            <div className="min-w-0">
                                <p className="hf-header-eyebrow">Clinical workspace</p>
                                <p className="text-sm font-medium text-slate-700">
                                    Readmission risk management
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-800">
                                        {formatRole(currentUser.role)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        User ID {currentUser.subject}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={logout}
                                    className="hf-button hf-button-secondary"
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </header>

                    <RiskSidebarMobile />

                    <div className="hf-content">
                        {/* Page introduction */}
                        <section className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                        <ActivityIcon />
                                    </span>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Clinical analytics
                                    </span>
                                </div>

                                <h1 className="hf-page-title">
                                    Readmission risk
                                </h1>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                    Assess patient readmission probability, review contributing
                                    factors, and monitor patients requiring additional attention.
                                </p>
                            </div>

                            <Link href="/" className="hf-link">
                                <span aria-hidden="true">← </span>
                                Back to overview
                            </Link>
                        </section>

                        {error && (
                            <div
                                role="alert"
                                className="hf-alert hf-alert-danger mb-6 flex items-start justify-between gap-4"
                            >
                                <span>{error}</span>
                                <button
                                    type="button"
                                    className="shrink-0 font-semibold"
                                    onClick={() => setError('')}
                                    aria-label="Dismiss error"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        {/* Summary metrics */}
                        <section
                            aria-label="Risk monitoring summary"
                            className="hf-kpi-grid md:grid-cols-2 xl:grid-cols-4"
                        >
                            <Kpi
                                label="Visible patients"
                                value={dashboardLoading ? '—' : patients.length}
                                detail="Available in your workspace"
                                accent="blue"
                            />

                            <Kpi
                                label="High-risk patients"
                                value={dashboardLoading ? '—' : highRiskPatients.length}
                                detail="Patients flagged by the model"
                                accent="red"
                            />

                            <Kpi
                                label="Expected readmissions"
                                value={
                                    forecast
                                        ? forecast.predicted_readmissions.toFixed(1)
                                        : '—'
                                }
                                detail="Next 30-day forecast"
                                accent="amber"
                            />

                            <Kpi
                                label="Predicted rate"
                                value={
                                    forecast
                                        ? `${(forecast.predicted_rate * 100).toFixed(1)}%`
                                        : '—'
                                }
                                detail="Forecast readmission rate"
                                accent="green"
                            />
                        </section>

                        {/* Forecast and model information */}
                        <section className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                            <div className="hf-panel">
                                <SectionHeading
                                    eyebrow="Planning"
                                    title="Readmission forecast"
                                    description="Probability-weighted estimates from the available prediction data."
                                />

                                <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                                    <ForecastMetric
                                        label="Forecast horizon"
                                        value={forecast ? `${forecast.horizon_days} days` : '—'}
                                    />
                                    <ForecastMetric
                                        label="Expected cases"
                                        value={
                                            forecast
                                                ? forecast.predicted_readmissions.toFixed(1)
                                                : '—'
                                        }
                                    />
                                    <ForecastMetric
                                        label="Predicted rate"
                                        value={
                                            forecast
                                                ? `${(forecast.predicted_rate * 100).toFixed(1)}%`
                                                : '—'
                                        }
                                    />
                                </div>
                            </div>

                            <div className="hf-panel">
                                <SectionHeading
                                    eyebrow="Model details"
                                    title="Prediction information"
                                    description="Details for the model used in the latest assessment."
                                />

                                <div className="grid grid-cols-2 gap-px bg-slate-100">
                                    <InfoCell
                                        label="Model"
                                        value={prediction?.model_name ?? 'readmission_xgboost_v1'}
                                    />
                                    <InfoCell
                                        label="Version"
                                        value={prediction?.model_version ?? '1.0.0'}
                                    />
                                    <InfoCell label="Prediction target" value="Readmission" />
                                    <InfoCell label="Forecast horizon" value="30 days" />
                                </div>
                            </div>
                        </section>

                        {/* Risk assessment */}
                        <section className="hf-panel mt-6">
                            <SectionHeading
                                eyebrow="Patient assessment"
                                title="Calculate readmission risk"
                                description="Select a patient and enter the admission characteristics required by the prediction model."
                            />

                            <div className="grid min-w-0 lg:grid-cols-[1.15fr_0.85fr]">
                                <form
                                    onSubmit={handlePrediction}
                                    className="min-w-0 border-b border-slate-100 p-5 sm:p-6 lg:border-b-0 lg:border-r"
                                >
                                    <div className="mb-5 flex items-center gap-2">
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                            <PatientIcon />
                                        </span>
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-800">
                                                Admission characteristics
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Complete the fields below
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                                        <Field label="Patient" full>
                                            <select
                                                value={selectedPatientId}
                                                onChange={(event) =>
                                                    setSelectedPatientId(event.target.value)
                                                }
                                                className={inputClass}
                                                required
                                                disabled={dashboardLoading || patients.length === 0}
                                            >
                                                <option value="">Select patient</option>
                                                {patients.map((patient) => (
                                                    <option key={patient.id} value={patient.id}>
                                                        {patient.medical_record_number} —{' '}
                                                        {patient.primary_diagnosis ?? 'No diagnosis'}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>

                                        <Field label="Length of stay (days)">
                                            <NumberInput
                                                value={timeInHospital}
                                                onChange={setTimeInHospital}
                                            />
                                        </Field>

                                        <Field label="Number of medications">
                                            <NumberInput
                                                value={numMedications}
                                                onChange={setNumMedications}
                                            />
                                        </Field>

                                        <Field label="Laboratory procedures">
                                            <NumberInput
                                                value={numLabProcedures}
                                                onChange={setNumLabProcedures}
                                            />
                                        </Field>

                                        <Field label="Number of diagnoses">
                                            <NumberInput
                                                value={numberDiagnoses}
                                                onChange={setNumberDiagnoses}
                                            />
                                        </Field>

                                        <Field label="Previous inpatient visits">
                                            <NumberInput
                                                value={numberInpatient}
                                                onChange={setNumberInpatient}
                                            />
                                        </Field>

                                        <Field label="Previous emergency visits">
                                            <NumberInput
                                                value={numberEmergency}
                                                onChange={setNumberEmergency}
                                            />
                                        </Field>
                                    </div>

                                    <div className="mt-6 flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
                                        <p className="text-xs leading-5 text-slate-400">
                                            Review the patient and admission values before calculating.
                                        </p>

                                        <button
                                            type="submit"
                                            disabled={
                                                loading ||
                                                dashboardLoading ||
                                                patients.length === 0 ||
                                                !selectedPatientId
                                            }
                                            className="hf-button hf-button-primary min-w-[150px]"
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="hf-spinner" aria-hidden="true" />
                                                    Calculating...
                                                </>
                                            ) : (
                                                <>
                                                    <ActivityIcon />
                                                    Calculate risk
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>

                                {/* Prediction result */}
                                <div className="min-w-0 bg-slate-50/70 p-5 sm:p-6">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                Assessment result
                                            </p>
                                            <h3 className="mt-1 text-base font-semibold text-slate-900">
                                                Readmission probability
                                            </h3>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Model-generated estimate for the selected patient
                                            </p>
                                        </div>

                                        {prediction && (
                                            <RiskBadge category={prediction.risk_category} />
                                        )}
                                    </div>

                                    {!prediction ? (
                                        <div className="mt-6 flex min-h-[235px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                                                <ChartIcon />
                                            </div>
                                            <p className="mt-4 text-sm font-semibold text-slate-700">
                                                No assessment yet
                                            </p>
                                            <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                                                Select a patient and calculate risk to see the
                                                probability and contributing factors here.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="mt-7 rounded-xl border border-slate-200 bg-white p-5">
                                            <div className="flex items-end gap-1.5">
                                                <span className="text-5xl font-semibold tracking-tight text-slate-900">
                                                    {(
                                                        prediction.readmission_probability * 100
                                                    ).toFixed(1)}
                                                </span>
                                                <span className="mb-1 text-xl text-slate-400">%</span>
                                            </div>

                                            <div className="mt-5 flex items-center justify-between gap-3">
                                                <span className="text-xs text-slate-500">
                                                    Predicted probability
                                                </span>
                                                <span className="text-xs font-semibold text-slate-700">
                                                    {formatRiskLabel(prediction.risk_category)}
                                                </span>
                                            </div>

                                            <div
                                                className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"
                                                role="progressbar"
                                                aria-label="Readmission probability"
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-valuenow={Math.min(
                                                    Math.max(prediction.readmission_probability * 100, 0),
                                                    100,
                                                )}
                                            >
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${prediction.risk_category === 'high'
                                                            ? 'bg-red-500'
                                                            : prediction.risk_category === 'medium'
                                                                ? 'bg-amber-500'
                                                                : 'bg-emerald-500'
                                                        }`}
                                                    style={{
                                                        width: `${Math.min(
                                                            Math.max(
                                                                prediction.readmission_probability * 100,
                                                                0,
                                                            ),
                                                            100,
                                                        )}%`,
                                                    }}
                                                />
                                            </div>

                                            <div className="mt-5 border-t border-slate-100 pt-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <span className="text-xs text-slate-500">
                                                        Model
                                                    </span>
                                                    <span className="max-w-[65%] break-words text-right text-xs font-medium text-slate-700">
                                                        {prediction.model_name}
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between gap-4">
                                                    <span className="text-xs text-slate-500">
                                                        Version
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-700">
                                                        {prediction.model_version}
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between gap-4">
                                                    <span className="text-xs text-slate-500">
                                                        Assessment date
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-700">
                                                        {formatDate(prediction.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                                        <span className="mt-0.5 text-blue-700">
                                            <InfoIcon />
                                        </span>
                                        <p className="text-xs leading-5 text-blue-900/80">
                                            Predictions support clinical review and should not be
                                            treated as a standalone medical decision.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Prediction explanations */}
                        {drivers && (
                            <section className="mt-6 grid min-w-0 gap-5 xl:grid-cols-2">
                                <div className="hf-panel">
                                    <SectionHeading
                                        eyebrow="Model explanation"
                                        title="Prediction factors"
                                        description="Feature contributions returned by the risk model."
                                    />

                                    {drivers.drivers.length === 0 ? (
                                        <EmptyState message="No prediction factors are available for this assessment." />
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {drivers.drivers.map((driver, index) => {
                                                const increases =
                                                    driver.direction === 'increases_risk';

                                                return (
                                                    <div
                                                        key={`${driver.feature}-${index}`}
                                                        className="flex items-center justify-between gap-4 px-5 py-4"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="break-words text-sm font-medium text-slate-800">
                                                                {driver.feature}
                                                            </p>
                                                            <p
                                                                className={`mt-1 text-xs ${increases ? 'text-red-600' : 'text-emerald-700'
                                                                    }`}
                                                            >
                                                                {increases
                                                                    ? 'Increases predicted risk'
                                                                    : 'Decreases predicted risk'}
                                                            </p>
                                                            {driver.value !== null && (
                                                                <p className="mt-1 text-xs text-slate-400">
                                                                    Value: {String(driver.value)}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <span
                                                            className={`shrink-0 rounded-md px-2 py-1 font-mono text-xs font-medium ${increases
                                                                    ? 'bg-red-50 text-red-700'
                                                                    : 'bg-emerald-50 text-emerald-700'
                                                                }`}
                                                        >
                                                            {driver.contribution > 0 ? '+' : ''}
                                                            {driver.contribution.toFixed(3)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="hf-panel">
                                    <SectionHeading
                                        eyebrow="Clinical context"
                                        title="Clinical interpretation"
                                        description="Insights returned alongside the selected model prediction."
                                    />

                                    {drivers.insights.length === 0 ? (
                                        <EmptyState message="No additional clinical insights were returned for this assessment." />
                                    ) : (
                                        <div className="space-y-3 p-5">
                                            {drivers.insights.map((insight, index) => (
                                                <div
                                                    key={`${insight.title}-${index}`}
                                                    className={`rounded-lg border p-4 ${getInsightStyle(
                                                        insight.severity,
                                                    )}`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className="mt-0.5">
                                                            <InfoIcon />
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h4 className="text-sm font-semibold">
                                                                    {insight.title}
                                                                </h4>
                                                                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                                                    {insight.severity}
                                                                </span>
                                                            </div>
                                                            <p className="mt-2 text-xs leading-5">
                                                                {insight.detail}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* High-risk monitoring */}
                        <section className="hf-panel mt-6">
                            <SectionHeading
                                eyebrow="Patient monitoring"
                                title="High-risk patients"
                                description="Patients identified by the high-risk endpoint for additional clinical review."
                                action={
                                    <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                        {dashboardLoading ? 'Loading…' : `${highRiskPatients.length} patients`}
                                    </span>
                                }
                            />

                            {dashboardLoading ? (
                                <div className="space-y-3 p-5">
                                    <div className="hf-skeleton h-10 w-full" />
                                    <div className="hf-skeleton h-10 w-full" />
                                    <div className="hf-skeleton h-10 w-full" />
                                </div>
                            ) : highRiskPatients.length === 0 ? (
                                <EmptyState message="No high-risk patients are currently identified by the model." />
                            ) : (
                                <div className="hf-table-wrapper">
                                    <table className="min-w-[760px] text-left">
                                        <thead>
                                            <tr>
                                                <TableHead>Patient</TableHead>
                                                <TableHead>Probability</TableHead>
                                                <TableHead>Risk level</TableHead>
                                                <TableHead>Model</TableHead>
                                                <TableHead>Prediction date</TableHead>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {highRiskPatients.map((item) => (
                                                <tr
                                                    key={`${item.patient_id}-${item.created_at ?? ''}`}
                                                    className="hf-table-row"
                                                >
                                                    <td className="hf-table-cell">
                                                        <div className="flex items-center gap-3">
                                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                                                                {String(item.patient_id).slice(0, 2)}
                                                            </span>
                                                            <div>
                                                                <p className="font-semibold text-slate-800">
                                                                    Patient #{item.patient_id}
                                                                </p>
                                                                <p className="text-[11px] text-slate-400">
                                                                    Patient record
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="hf-table-cell">
                                                        <span className="font-semibold text-slate-800">
                                                            {(item.readmission_probability * 100).toFixed(1)}%
                                                        </span>
                                                    </td>

                                                    <td className="hf-table-cell">
                                                        <RiskBadge category={item.risk_category} />
                                                    </td>

                                                    <td className="hf-table-cell">
                                                        <span className="break-words">
                                                            {item.model_name}
                                                        </span>
                                                    </td>

                                                    <td className="hf-table-cell">
                                                        {formatDate(item.created_at)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <footer className="mt-6 flex flex-col gap-2 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs leading-5 text-slate-400">
                                HealthForecast AI · Clinical decision support
                            </p>
                            <p className="max-w-2xl text-xs leading-5 text-slate-400 sm:text-right">
                                Risk predictions are model-generated estimates intended to
                                support clinical review. They do not replace professional
                                clinical judgment.
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
        </main>
    );
}

/* =========================================================
   Sidebar and navigation
   ========================================================= */

function RiskSidebar() {
    return (
        <aside className="hf-sidebar">
            <div className="hf-sidebar-inner">
                <div className="hf-sidebar-brand">
                    <BrandMark />
                    <p className="mt-2">Clinical workspace</p>
                </div>

                <div className="px-5 pb-1 pt-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">
                        Workspace
                    </p>
                </div>

                <nav className="hf-sidebar-nav" aria-label="Primary navigation">
                    <Link href="/" className="hf-nav-item">
                        <OverviewIcon />
                        <span>Overview</span>
                    </Link>

                    <Link
                        href="/risk"
                        className="hf-nav-item hf-nav-active"
                        aria-current="page"
                    >
                        <ActivityIcon />
                        <span>Risk prediction</span>
                    </Link>

                    <Link href="/analytics" className="hf-nav-item">
                        <ChartIcon />
                        <span>Healthcare analytics</span>
                    </Link>
                </nav>

                <div className="mt-auto px-4 pb-4">
                    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-blue-700">
                                <ShieldIcon />
                            </span>
                            <div>
                                <p className="text-xs font-semibold text-slate-700">
                                    Clinical workspace
                                </p>
                                <p className="mt-0.5 text-[10px] text-slate-500">
                                    Risk monitoring
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hf-sidebar-footer">
                    <p>Application</p>
                    <p>HealthForecast AI</p>
                </div>
            </div>
        </aside>
    );
}

function RiskSidebarMobile() {
    return (
        <nav className="hf-mobile-nav" aria-label="Primary navigation">
            <Link href="/">Overview</Link>
            <Link href="/risk" className="active" aria-current="page">
                Risk prediction
            </Link>
            <Link href="/analytics">Analytics</Link>
        </nav>
    );
}

/* =========================================================
   Reusable presentation components
   ========================================================= */

function BrandMark() {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <BrandIcon />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-slate-900">
                HealthForecast
                <span className="text-blue-600"> AI</span>
            </span>
        </div>
    );
}

function SectionHeading({
    eyebrow,
    title,
    description,
    action,
}: {
    eyebrow: string;
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="hf-section-head">
            <div className="min-w-0">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {eyebrow}
                </p>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

function Kpi({
    label,
    value,
    detail,
    accent,
}: {
    label: string;
    value: string | number;
    detail: string;
    accent: 'blue' | 'red' | 'amber' | 'green';
}) {
    const accents = {
        blue: 'bg-blue-50 text-blue-700',
        red: 'bg-red-50 text-red-700',
        amber: 'bg-amber-50 text-amber-700',
        green: 'bg-emerald-50 text-emerald-700',
    };

    return (
        <div className="hf-kpi">
            <div className="flex items-center justify-between gap-3">
                <p>{label}</p>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accents[accent]}`}>
                    <SmallMetricIcon />
                </span>
            </div>
            <p>{value}</p>
            <p className="mt-2 text-xs font-normal normal-case tracking-normal text-slate-400">
                {detail}
            </p>
        </div>
    );
}

function ForecastMetric({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {value}
            </p>
        </div>
    );
}

function InfoCell({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="min-w-0 bg-white px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {label}
            </p>
            <p className="mt-1.5 break-words text-sm font-medium text-slate-800">
                {value}
            </p>
        </div>
    );
}

function Field({
    label,
    children,
    full = false,
}: {
    label: string;
    children: ReactNode;
    full?: boolean;
}) {
    return (
        <label className={full ? 'sm:col-span-2' : ''}>
            <span className="mb-2 block text-xs font-semibold text-slate-700">
                {label}
            </span>
            {children}
        </label>
    );
}

function NumberInput({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <input
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={inputClass}
            required
        />
    );
}

function RiskBadge({
    category,
}: {
    category: 'low' | 'medium' | 'high';
}) {
    const styles = {
        low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        medium: 'border-amber-200 bg-amber-50 text-amber-700',
        high: 'border-red-200 bg-red-50 text-red-700',
    };

    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold capitalize ${styles[category]}`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${category === 'high'
                        ? 'bg-red-500'
                        : category === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                    }`}
            />
            {category} risk
        </span>
    );
}

function TableHead({ children }: { children: ReactNode }) {
    return <th className="hf-table-head">{children}</th>;
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="px-5 py-10 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <InfoIcon />
            </span>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                {message}
            </p>
        </div>
    );
}

function LoadingScreen({ text }: { text: string }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
            <div className="text-center">
                <span className="hf-spinner mx-auto mb-4 block" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-600">{text}</p>
            </div>
        </main>
    );
}

/* =========================================================
   Small inline SVG icons — no extra dependencies
   ========================================================= */

function BrandIcon() {
    return (
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true">
            <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" opacity=".65" />
        </svg>
    );
}

function OverviewIcon() {
    return (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    );
}

function ActivityIcon() {
    return (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
            <path d="M3 12h4l3-8 4 16 3-8h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ChartIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
            <path d="M4 19.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="5" y="11" width="3.5" height="7" rx="1" fill="currentColor" opacity=".7" />
            <rect x="10.25" y="6" width="3.5" height="12" rx="1" fill="currentColor" opacity=".85" />
            <rect x="15.5" y="3.5" width="3.5" height="14.5" rx="1" fill="currentColor" />
        </svg>
    );
}

function PatientIcon() {
    return (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
            <circle cx="12" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="M5 20c.5-4 2.8-6 7-6s6.5 2 7 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <path d="M12 3 19 6v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function SmallMetricIcon() {
    return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
            <path d="M4 17.5 9 12l3 2.5 7-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14.5 6.5H19v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function InfoIcon() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

/* =========================================================
   Formatting and error helpers
   ========================================================= */

function getRequestError(error: unknown, label: string) {
    if (error instanceof ApiError) {
        return `${label}: ${error.message}`;
    }

    return `${label}: unable to load data.`;
}

function formatRole(role: string) {
    return role
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
    if (!value) return 'Not available';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Not available';
    }

    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatRiskLabel(category: 'low' | 'medium' | 'high') {
    return `${category.charAt(0).toUpperCase()}${category.slice(1)} risk`;
}

function getInsightStyle(severity: string) {
    const normalized = severity.toLowerCase();

    if (
        normalized.includes('high') ||
        normalized.includes('critical') ||
        normalized.includes('severe')
    ) {
        return 'border-red-200 bg-red-50 text-red-900';
    }

    if (
        normalized.includes('medium') ||
        normalized.includes('moderate') ||
        normalized.includes('warning')
    ) {
        return 'border-amber-200 bg-amber-50 text-amber-950';
    }

    return 'border-slate-200 bg-slate-50 text-slate-800';
}
