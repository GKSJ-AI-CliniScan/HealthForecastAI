'use client';

import Link from 'next/link';
import {
    FormEvent,
    useCallback,
    useEffect,
    useState,
} from 'react';

import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

import type {
    Patient,
    ReadmissionForecast,
    RiskDriversResponse,
    RiskPrediction,
} from '@/types';

export default function RiskPage() {
    const {
        token,
        currentUser,
        loading: authLoading,
        logout,
    } = useAuth();

    const [patients, setPatients] =
        useState<Patient[]>([]);

    const [highRiskPatients, setHighRiskPatients] =
        useState<RiskPrediction[]>([]);

    const [forecast, setForecast] =
        useState<ReadmissionForecast | null>(null);

    const [prediction, setPrediction] =
        useState<RiskPrediction | null>(null);

    const [drivers, setDrivers] =
        useState<RiskDriversResponse | null>(null);

    const [selectedPatientId, setSelectedPatientId] =
        useState('');

    const [timeInHospital, setTimeInHospital] =
        useState('4');

    const [numMedications, setNumMedications] =
        useState('10');

    const [numLabProcedures, setNumLabProcedures] =
        useState('40');

    const [numberDiagnoses, setNumberDiagnoses] =
        useState('5');

    const [numberInpatient, setNumberInpatient] =
        useState('0');

    const [numberEmergency, setNumberEmergency] =
        useState('0');

    const [loading, setLoading] =
        useState(false);

    const [dashboardLoading, setDashboardLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const loadDashboard = useCallback(
        async () => {
            if (!token) return;

            setDashboardLoading(true);

            try {
                setError('');

                const [
                    patientData,
                    highRiskData,
                    forecastData,
                ] = await Promise.all([
                    apiFetch<Patient[]>(
                        '/patients',
                        {},
                        token,
                    ),

                    apiFetch<RiskPrediction[]>(
                        '/risk/high-risk',
                        {},
                        token,
                    ),

                    apiFetch<ReadmissionForecast>(
                        '/risk/forecast?horizon_days=30',
                        {},
                        token,
                    ),
                ]);

                setPatients(patientData);
                setHighRiskPatients(highRiskData);
                setForecast(forecastData);

                setSelectedPatientId((current) => {
                    if (current) return current;

                    return patientData.length > 0
                        ? String(patientData[0].id)
                        : '';
                });
            } catch (err) {
                setError(
                    err instanceof ApiError
                        ? err.message
                        : 'Unable to load the risk dashboard.',
                );
            } finally {
                setDashboardLoading(false);
            }
        },
        [token],
    );

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    async function handlePrediction(
        event: FormEvent<HTMLFormElement>,
    ) {
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
            num_lab_procedures: Number(
                numLabProcedures,
            ),
            number_diagnoses: Number(
                numberDiagnoses,
            ),
            number_inpatient: Number(
                numberInpatient,
            ),
            number_emergency: Number(
                numberEmergency,
            ),
        };

        try {
            const result =
                await apiFetch<RiskPrediction>(
                    '/risk/predict',
                    {
                        method: 'POST',
                        body: JSON.stringify(payload),
                    },
                    token,
                );

            setPrediction(result);

            const driverResult =
                await apiFetch<RiskDriversResponse>(
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
        return (
            <LoadingScreen text="Loading workspace..." />
        );
    }

    if (!token || !currentUser) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-6">
                <div className="w-full max-w-md border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <p className="text-sm font-semibold text-[#155eef]">
                        HealthForecast AI
                    </p>

                    <h1 className="mt-3 text-xl font-semibold text-slate-900">
                        Authentication required
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Sign in to access patient risk prediction
                        and readmission analytics.
                    </p>

                    <Link
                        href="/"
                        className="mt-6 inline-block bg-[#155eef] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#124dcc]"
                    >
                        Return to sign in
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f5f7fa]">
            <div className="flex min-h-screen">

                <RiskSidebar />

                <div className="min-w-0 flex-1">

                    <header className="border-b border-slate-200 bg-white">
                        <div className="flex min-h-[72px] items-center justify-between px-6">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-slate-400">
                                    Clinical analytics
                                </p>

                                <h1 className="mt-1 text-lg font-semibold text-slate-900">
                                    Readmission Risk
                                </h1>
                            </div>

                            <div className="flex items-center gap-5">
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-800">
                                        {formatRole(
                                            currentUser.role,
                                        )}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                        User ID {currentUser.subject}
                                    </p>
                                </div>

                                <button
                                    onClick={logout}
                                    className="border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="mx-auto max-w-[1400px] px-6 py-7">

                        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <p className="text-sm text-slate-500">
                                    Risk prediction
                                </p>

                                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                                    Hospital readmission monitoring
                                </h2>

                                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                                    Review current risk indicators, score
                                    an admission and inspect model-derived
                                    factors affecting the prediction.
                                </p>
                            </div>

                            <Link
                                href="/"
                                className="text-sm font-medium text-[#155eef] hover:underline"
                            >
                                Back to overview
                            </Link>
                        </div>

                        {error && (
                            <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {/* KPI ROW */}

                        <section className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 md:grid-cols-4">
                            <Kpi
                                label="Visible patients"
                                value={patients.length}
                            />

                            <Kpi
                                label="High-risk patients"
                                value={
                                    highRiskPatients.length
                                }
                            />

                            <Kpi
                                label="Expected readmissions"
                                value={
                                    forecast
                                        ? forecast.predicted_readmissions.toFixed(
                                            1,
                                        )
                                        : '—'
                                }
                            />

                            <Kpi
                                label="Predicted rate"
                                value={
                                    forecast
                                        ? `${(
                                            forecast.predicted_rate *
                                            100
                                        ).toFixed(1)}%`
                                        : '—'
                                }
                            />
                        </section>

                        {/* OPERATIONAL SUMMARY */}

                        <section className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">

                            <div className="border border-slate-200 bg-white">

                                <div className="border-b border-slate-200 px-5 py-4">
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Readmission forecast
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Probability-weighted estimate based on
                                        the latest available patient predictions.
                                    </p>
                                </div>

                                <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">

                                    <ForecastMetric
                                        label="Forecast horizon"
                                        value={
                                            forecast
                                                ? `${forecast.horizon_days} days`
                                                : '—'
                                        }
                                    />

                                    <ForecastMetric
                                        label="Expected cases"
                                        value={
                                            forecast
                                                ? forecast.predicted_readmissions.toFixed(
                                                    1,
                                                )
                                                : '—'
                                        }
                                    />

                                    <ForecastMetric
                                        label="Predicted rate"
                                        value={
                                            forecast
                                                ? `${(
                                                    forecast.predicted_rate *
                                                    100
                                                ).toFixed(1)}%`
                                                : '—'
                                        }
                                    />

                                </div>
                            </div>

                            <div className="border border-slate-200 bg-white">

                                <div className="border-b border-slate-200 px-5 py-4">
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Model information
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Model currently used for risk scoring.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-px bg-slate-200">
                                    <InfoCell
                                        label="Model"
                                        value={
                                            prediction?.model_name ??
                                            'readmission_xgboost_v1'
                                        }
                                    />

                                    <InfoCell
                                        label="Version"
                                        value={
                                            prediction?.model_version ??
                                            '1.0.0'
                                        }
                                    />

                                    <InfoCell
                                        label="Target"
                                        value="Readmission"
                                    />

                                    <InfoCell
                                        label="Horizon"
                                        value="30 days"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* PATIENT SCORING */}

                        <section className="mt-7 border border-slate-200 bg-white">

                            <div className="border-b border-slate-200 px-5 py-4">
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Patient risk assessment
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    Enter the admission characteristics
                                    required by the readmission model.
                                </p>
                            </div>

                            <div className="grid lg:grid-cols-[1fr_0.8fr]">

                                <form
                                    onSubmit={handlePrediction}
                                    className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r"
                                >

                                    <div className="grid gap-5 sm:grid-cols-2">

                                        <Field
                                            label="Patient"
                                            full
                                        >
                                            <select
                                                value={selectedPatientId}
                                                onChange={(event) =>
                                                    setSelectedPatientId(
                                                        event.target.value,
                                                    )
                                                }
                                                className={inputClass}
                                                required
                                            >
                                                <option value="">
                                                    Select patient
                                                </option>

                                                {patients.map(
                                                    (patient) => (
                                                        <option
                                                            key={patient.id}
                                                            value={patient.id}
                                                        >
                                                            {
                                                                patient.medical_record_number
                                                            }{' '}
                                                            —{' '}
                                                            {patient.primary_diagnosis ??
                                                                'No diagnosis'}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </Field>

                                        <Field label="Length of stay">
                                            <NumberInput
                                                value={timeInHospital}
                                                onChange={
                                                    setTimeInHospital
                                                }
                                            />
                                        </Field>

                                        <Field label="Number of medications">
                                            <NumberInput
                                                value={numMedications}
                                                onChange={
                                                    setNumMedications
                                                }
                                            />
                                        </Field>

                                        <Field label="Laboratory procedures">
                                            <NumberInput
                                                value={numLabProcedures}
                                                onChange={
                                                    setNumLabProcedures
                                                }
                                            />
                                        </Field>

                                        <Field label="Number of diagnoses">
                                            <NumberInput
                                                value={numberDiagnoses}
                                                onChange={
                                                    setNumberDiagnoses
                                                }
                                            />
                                        </Field>

                                        <Field label="Previous inpatient visits">
                                            <NumberInput
                                                value={numberInpatient}
                                                onChange={
                                                    setNumberInpatient
                                                }
                                            />
                                        </Field>

                                        <Field label="Previous emergency visits">
                                            <NumberInput
                                                value={numberEmergency}
                                                onChange={
                                                    setNumberEmergency
                                                }
                                            />
                                        </Field>

                                    </div>

                                    <div className="mt-6 flex justify-end border-t border-slate-200 pt-5">
                                        <button
                                            type="submit"
                                            disabled={
                                                loading ||
                                                dashboardLoading ||
                                                patients.length === 0
                                            }
                                            className="bg-[#155eef] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#124dcc] disabled:opacity-50"
                                        >
                                            {loading
                                                ? 'Calculating...'
                                                : 'Calculate risk'}
                                        </button>
                                    </div>

                                </form>

                                {/* RESULT */}

                                <div className="p-5">

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Latest assessment
                                            </p>

                                            <h4 className="mt-1 text-sm font-semibold text-slate-900">
                                                Readmission probability
                                            </h4>
                                        </div>

                                        {prediction && (
                                            <RiskBadge
                                                category={
                                                    prediction.risk_category
                                                }
                                            />
                                        )}
                                    </div>

                                    {!prediction ? (
                                        <div className="mt-8 border border-dashed border-slate-300 px-5 py-8 text-center">
                                            <p className="text-sm text-slate-500">
                                                No assessment has been generated
                                                in this session.
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                Enter the admission information
                                                and calculate risk.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="mt-6">

                                            <div className="flex items-end gap-2">
                                                <span className="text-5xl font-semibold tracking-tight text-slate-900">
                                                    {(
                                                        prediction.readmission_probability *
                                                        100
                                                    ).toFixed(1)}
                                                </span>

                                                <span className="mb-1 text-xl text-slate-500">
                                                    %
                                                </span>
                                            </div>

                                            <div className="mt-5 border-t border-slate-200 pt-5">
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span>
                                                        Model probability
                                                    </span>

                                                    <span>
                                                        {prediction.model_name}
                                                    </span>
                                                </div>

                                                <div className="mt-2 h-2 bg-slate-100">
                                                    <div
                                                        className={`h-2 ${prediction.risk_category ===
                                                                'high'
                                                                ? 'bg-red-500'
                                                                : prediction.risk_category ===
                                                                    'medium'
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-emerald-500'
                                                            }`}
                                                        style={{
                                                            width: `${Math.min(
                                                                prediction.readmission_probability *
                                                                100,
                                                                100,
                                                            )}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                        </div>
                                    )}

                                </div>
                            </div>
                        </section>

                        {/* EXPLANATION */}

                        {drivers && (
                            <section className="mt-7 grid gap-6 lg:grid-cols-2">

                                <div className="border border-slate-200 bg-white">

                                    <div className="border-b border-slate-200 px-5 py-4">
                                        <h3 className="text-sm font-semibold text-slate-900">
                                            Prediction factors
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Model-derived feature contributions
                                            for the selected assessment.
                                        </p>
                                    </div>

                                    <div className="divide-y divide-slate-200">
                                        {drivers.drivers.map(
                                            (driver, index) => {
                                                const increases =
                                                    driver.direction ===
                                                    'increases_risk';

                                                return (
                                                    <div
                                                        key={`${driver.feature}-${index}`}
                                                        className="flex items-center justify-between gap-5 px-5 py-4"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-800">
                                                                {driver.feature}
                                                            </p>

                                                            <p
                                                                className={`mt-1 text-xs ${increases
                                                                        ? 'text-red-600'
                                                                        : 'text-emerald-700'
                                                                    }`}
                                                            >
                                                                {increases
                                                                    ? 'Increases predicted risk'
                                                                    : 'Decreases predicted risk'}
                                                            </p>
                                                        </div>

                                                        <span className="shrink-0 font-mono text-xs text-slate-500">
                                                            {driver.contribution >
                                                                0
                                                                ? '+'
                                                                : ''}
                                                            {driver.contribution.toFixed(
                                                                3,
                                                            )}
                                                        </span>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>

                                </div>

                                <div className="border border-slate-200 bg-white">

                                    <div className="border-b border-slate-200 px-5 py-4">
                                        <h3 className="text-sm font-semibold text-slate-900">
                                            Clinical interpretation
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Supporting interpretation generated
                                            from the model output.
                                        </p>
                                    </div>

                                    <div className="divide-y divide-slate-200">
                                        {drivers.insights.map(
                                            (insight, index) => (
                                                <div
                                                    key={`${insight.title}-${index}`}
                                                    className="px-5 py-4"
                                                >
                                                    <p className="text-sm font-semibold text-slate-800">
                                                        {insight.title}
                                                    </p>

                                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                                        {insight.detail}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </div>

                                </div>
                            </section>
                        )}

                        {/* HIGH RISK */}

                        <section className="mt-7 border border-slate-200 bg-white">

                            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        High-risk patients
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Patients whose latest recorded
                                        prediction is in the high-risk band.
                                    </p>
                                </div>

                                <span className="text-sm text-slate-500">
                                    {highRiskPatients.length}{' '}
                                    patients
                                </span>
                            </div>

                            {highRiskPatients.length === 0 ? (
                                <div className="px-5 py-10 text-center">
                                    <p className="text-sm text-slate-500">
                                        No high-risk patients are currently
                                        identified.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[760px] text-left">

                                        <thead className="bg-slate-50">
                                            <tr>
                                                <TableHead>
                                                    Patient
                                                </TableHead>

                                                <TableHead>
                                                    Probability
                                                </TableHead>

                                                <TableHead>
                                                    Risk level
                                                </TableHead>

                                                <TableHead>
                                                    Model
                                                </TableHead>

                                                <TableHead>
                                                    Prediction date
                                                </TableHead>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {highRiskPatients.map(
                                                (item) => (
                                                    <tr
                                                        key={`${item.patient_id}-${item.created_at ?? ''}`}
                                                        className="border-t border-slate-200"
                                                    >
                                                        <td className="px-5 py-4 text-sm font-medium text-slate-800">
                                                            Patient #
                                                            {item.patient_id}
                                                        </td>

                                                        <td className="px-5 py-4 text-sm text-slate-700">
                                                            {(
                                                                item.readmission_probability *
                                                                100
                                                            ).toFixed(1)}
                                                            %
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <RiskBadge
                                                                category={
                                                                    item.risk_category
                                                                }
                                                            />
                                                        </td>

                                                        <td className="px-5 py-4 text-sm text-slate-500">
                                                            {item.model_name}
                                                        </td>

                                                        <td className="px-5 py-4 text-sm text-slate-500">
                                                            {formatDate(
                                                                item.created_at,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>

                                    </table>
                                </div>
                            )}

                        </section>

                        <p className="mt-6 text-xs leading-5 text-slate-400">
                            Risk predictions are model-generated estimates
                            intended to support clinical review. They do not
                            replace professional clinical judgment.
                        </p>

                    </div>
                </div>
            </div>
        </main>
    );
}

const inputClass =
    'w-full border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#155eef] focus:ring-1 focus:ring-[#155eef]';

function RiskSidebar() {
    return (
        <aside className="hidden w-60 shrink-0 bg-[#172033] text-white lg:block">
            <div className="sticky top-0 h-screen">

                <div className="border-b border-white/10 px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
                        HealthForecast
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                        Clinical Workspace
                    </p>
                </div>

                <nav className="px-3 py-5">

                    <Link
                        href="/"
                        className="mb-1 block border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white"
                    >
                        Overview
                    </Link>

                    <Link
                        href="/risk"
                        className="mb-1 block border-l-2 border-blue-400 bg-white/10 px-3 py-2.5 text-sm font-medium text-white"
                    >
                        Risk prediction
                    </Link>

                </nav>

                <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 px-5 py-4">
                    <p className="text-xs text-slate-500">
                        Clinical analytics
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                        Readmission monitoring
                    </p>
                </div>

            </div>
        </aside>
    );
}

function Kpi({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div className="bg-white px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-semibold text-slate-900">
                {value}
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
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-lg font-semibold text-slate-900">
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
        <div className="bg-white px-4 py-4">
            <p className="text-xs text-slate-500">
                {label}
            </p>

            <p className="mt-1 truncate text-sm font-medium text-slate-800">
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
    children: React.ReactNode;
    full?: boolean;
}) {
    return (
        <label
            className={
                full ? 'sm:col-span-2' : ''
            }
        >
            <span className="mb-2 block text-sm font-medium text-slate-700">
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
            value={value}
            onChange={(event) =>
                onChange(event.target.value)
            }
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
        medium:
            'border-amber-200 bg-amber-50 text-amber-700',
        high: 'border-red-200 bg-red-50 text-red-700',
    };

    return (
        <span
            className={`inline-flex border px-2 py-1 text-xs font-semibold capitalize ${styles[category]}`}
        >
            {category} risk
        </span>
    );
}

function TableHead({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}

function LoadingScreen({
    text,
}: {
    text: string;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
            <p className="text-sm text-slate-500">
                {text}
            </p>
        </main>
    );
}

function formatRole(role: string) {
    return role
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase(),
        );
}

function formatDate(
    value?: string | null,
) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Not available';
    }

    return date.toLocaleDateString();
}