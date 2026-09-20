'use client';

import Link from 'next/link';
import {
    useCallback,
    useEffect,
    useState,
} from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

import type {
    HospitalAnalyticsSummary,
    MedicationOutcomeSummary,
    PopulationHealthResponse,
    ReadmissionTrend,
    RecoveryTrend,
    TreatmentEffectivenessSummary,
} from '@/types';

const HOSPITAL_ANALYTICS_PERMISSION =
    'hospital_analytics:read';

const TREATMENT_PERMISSION =
    'treatment_report:read';

const POPULATION_HEALTH_PERMISSION =
    'population_health:read';

export default function AnalyticsPage() {
    const {
        token,
        currentUser,
        loading: authLoading,
        logout,
    } = useAuth();

    const [summary, setSummary] =
        useState<HospitalAnalyticsSummary | null>(null);

    const [treatments, setTreatments] =
        useState<TreatmentEffectivenessSummary[]>([]);

    const [recoveryTrends, setRecoveryTrends] =
        useState<RecoveryTrend[]>([]);

    const [readmissionTrends, setReadmissionTrends] =
        useState<ReadmissionTrend[]>([]);

    const [populationHealth, setPopulationHealth] =
        useState<PopulationHealthResponse | null>(null);

    const [medicationOutcomes, setMedicationOutcomes] =
        useState<MedicationOutcomeSummary[]>([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState('');

    const hasPermission = useCallback(
        (permission: string): boolean => {
            return Boolean(
                currentUser?.permissions?.includes(permission),
            );
        },
        [currentUser],
    );

    const loadAnalytics = useCallback(async () => {
        if (!token || !currentUser) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const requests: Promise<unknown>[] = [];

            if (
                hasPermission(
                    HOSPITAL_ANALYTICS_PERMISSION,
                )
            ) {
                requests.push(
                    apiFetch<HospitalAnalyticsSummary>(
                        '/analytics/summary',
                        {},
                        token,
                    ).then(setSummary),
                );

                requests.push(
                    apiFetch<ReadmissionTrend[]>(
                        '/analytics/readmissions',
                        {},
                        token,
                    ).then(setReadmissionTrends),
                );
            }

            if (
                hasPermission(TREATMENT_PERMISSION)
            ) {
                requests.push(
                    apiFetch<TreatmentEffectivenessSummary[]>(
                        '/treatment',
                        {},
                        token,
                    ).then(setTreatments),
                );

                requests.push(
                    apiFetch<RecoveryTrend[]>(
                        '/treatment/recovery-trends',
                        {},
                        token,
                    ).then(setRecoveryTrends),
                );

                requests.push(
                    apiFetch<MedicationOutcomeSummary[]>(
                        '/treatment/medication-outcomes',
                        {},
                        token,
                    ).then(setMedicationOutcomes),
                );
            }

            if (
                hasPermission(
                    POPULATION_HEALTH_PERMISSION,
                )
            ) {
                requests.push(
                    apiFetch<PopulationHealthResponse>(
                        '/analytics/population-health',
                        {},
                        token,
                    ).then(setPopulationHealth),
                );
            }

            await Promise.all(requests);
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : 'Unable to load healthcare analytics.',
            );
        } finally {
            setLoading(false);
        }
    }, [
        token,
        currentUser,
        hasPermission,
    ]);

    useEffect(() => {
        void loadAnalytics();
    }, [loadAnalytics]);

    if (authLoading) {
        return (
            <LoadingScreen text="Loading workspace..." />
        );
    }

    if (!token || !currentUser) {
        return (
            <main className="hf-shell items-center justify-center bg-[#f5f7fa] px-6">
                <div className="w-full max-w-md hf-panel p-8 text-center shadow-sm">
                    <p className="text-sm font-semibold text-[#155eef]">
                        HealthForecast AI
                    </p>

                    <h1 className="mt-3 text-xl font-semibold text-slate-900">
                        Authentication required
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Sign in to access healthcare analytics.
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

    const canViewHospital =
        hasPermission(
            HOSPITAL_ANALYTICS_PERMISSION,
        );

    const canViewTreatment =
        hasPermission(TREATMENT_PERMISSION);

    const canViewPopulation =
        hasPermission(
            POPULATION_HEALTH_PERMISSION,
        );

    return (
        <main className="hf-page">
            <div className="hf-shell">
                <AnalyticsSidebar />

                <div className="hf-main">
                    <header className="hf-header">
                        <div className="flex min-h-[72px] items-center justify-between px-6">
                            <div>
                                <p className="hf-header-eyebrow">
                                    Healthcare analytics
                                </p>

                                <h1 className="mt-1 text-lg font-semibold text-slate-900">
                                    Hospital Performance
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
                                        User ID{' '}
                                        {currentUser.subject}
                                    </p>
                                </div>

                                <button
                                    onClick={logout}
                                    className="hf-button hf-button-secondary"
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="hf-content">
                        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <p className="text-sm text-slate-500">
                                    Analytics
                                </p>

                                <h2 className="mt-1 hf-page-title">
                                    Healthcare performance analytics
                                </h2>

                                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                                    Review hospital performance,
                                    treatment outcomes,
                                    readmission trends and
                                    aggregated population-health
                                    statistics.
                                </p>
                            </div>

                            <Link
                                href="/"
                                className="hf-link"
                            >
                                Back to overview
                            </Link>
                        </div>

                        {error && (
                            <div className="mb-6 hf-alert hf-alert-danger">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <LoadingScreen text="Loading analytics..." />
                        ) : (
                            <>
                                {canViewHospital && (
                                    <>
                                        <HospitalSummary
                                            summary={summary}
                                        />

                                        {summary && (
                                            <div className="mt-7">
                                                <RiskDistributionChart
                                                    distribution={
                                                        summary.risk_distribution
                                                    }
                                                />
                                            </div>
                                        )}

                                        {readmissionTrends.length >
                                            0 && (
                                                <div className="mt-7">
                                                    <ReadmissionTrendChart
                                                        trends={
                                                            readmissionTrends
                                                        }
                                                    />
                                                </div>
                                            )}

                                        <ReadmissionSection
                                            trends={
                                                readmissionTrends
                                            }
                                        />
                                    </>
                                )}

                                {canViewTreatment && (
                                    <>
                                        {treatments.length > 0 && (
                                            <div className="mt-7">
                                                <TreatmentEffectivenessChart
                                                    treatments={
                                                        treatments
                                                    }
                                                />
                                            </div>
                                        )}

                                        {recoveryTrends.length >
                                            0 && (
                                                <div className="mt-7">
                                                    <RecoveryTrendChart
                                                        trends={
                                                            recoveryTrends
                                                        }
                                                    />
                                                </div>
                                            )}

                                        <TreatmentSection
                                            treatments={treatments}
                                        />

                                        <MedicationOutcomeSection
                                            outcomes={
                                                medicationOutcomes
                                            }
                                        />

                                        <RecoverySection
                                            trends={
                                                recoveryTrends
                                            }
                                        />
                                    </>
                                )}

                                {canViewPopulation && (
                                    <PopulationHealthSection
                                        data={populationHealth}
                                    />
                                )}

                                {!canViewHospital &&
                                    !canViewTreatment &&
                                    !canViewPopulation && (
                                        <EmptyPanel
                                            title="Analytics access unavailable"
                                            text="Your current role does not have permission to view the available analytics reports."
                                        />
                                    )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

function HospitalSummary({
    summary,
}: {
    summary: HospitalAnalyticsSummary | null;
}) {
    if (!summary) {
        return (
            <EmptyPanel
                title="Hospital analytics unavailable"
                text="No hospital-level analytics are currently available."
            />
        );
    }

    return (
        <section>
            <SectionTitle
                title="Hospital overview"
                description="Current hospital-level performance indicators."
            />

            <div className="hf-kpi-grid md:grid-cols-4">
                <Metric
                    label="Total patients"
                    value={summary.total_patients}
                />

                <Metric
                    label="Total admissions"
                    value={summary.total_admissions}
                />

                <Metric
                    label="Readmission rate"
                    value={`${(
                        summary.readmission_rate * 100
                    ).toFixed(1)}%`}
                />

                <Metric
                    label="Average length of stay"
                    value={`${summary.average_length_of_stay.toFixed(
                        1,
                    )} days`}
                />
            </div>

            <div className="mt-6 hf-panel">
                <SectionHeader
                    title="Risk distribution"
                    description="Patients grouped by their latest recorded risk category."
                />

                <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    <Metric
                        label="Low risk"
                        value={summary.risk_distribution.low}
                    />

                    <Metric
                        label="Medium risk"
                        value={summary.risk_distribution.medium}
                    />

                    <Metric
                        label="High risk"
                        value={summary.risk_distribution.high}
                    />
                </div>
            </div>
        </section>
    );
}

function ReadmissionTrendChart({
    trends,
}: {
    trends: ReadmissionTrend[];
}) {
    const data = trends.map((item) => ({
        period: item.period,
        admissions: item.admissions,
        readmissions: item.readmissions,
        rate: Number(
            (item.readmission_rate * 100).toFixed(1),
        ),
    }));

    return (
        <section className="hf-panel">
            <SectionHeader
                title="Readmission trend"
                description="Monthly admission volume and observed readmission rate."
            />

            <div className="h-[320px] px-5 pb-5">
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                >
                    <LineChart
                        data={data}
                        margin={{
                            top: 15,
                            right: 20,
                            left: 0,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            dataKey="period"
                            tick={{ fontSize: 12 }}
                        />

                        <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 12 }}
                        />

                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            unit="%"
                            tick={{ fontSize: 12 }}
                        />

                        <Tooltip />

                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="admissions"
                            name="Admissions"
                            stroke="#1e3a5f"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                        />

                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="readmissions"
                            name="Readmissions"
                            stroke="#b45309"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                        />

                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="rate"
                            name="Readmission rate"
                            stroke="#047857"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}

function RecoveryTrendChart({
    trends,
}: {
    trends: RecoveryTrend[];
}) {
    const data = trends.map((item) => ({
        week: item.week,
        recovery: Number(
            item.average_recovery_score.toFixed(1),
        ),
    }));

    return (
        <section className="hf-panel">
            <SectionHeader
                title="Recovery trend"
                description="Average recovery score by admission week."
            />

            <div className="h-[320px] px-5 pb-5">
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                >
                    <LineChart
                        data={data}
                        margin={{
                            top: 15,
                            right: 20,
                            left: 0,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            dataKey="week"
                            tick={{ fontSize: 11 }}
                            interval="preserveStartEnd"
                        />

                        <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 12 }}
                        />

                        <Tooltip />

                        <Line
                            type="monotone"
                            dataKey="recovery"
                            name="Average recovery"
                            stroke="#1e3a5f"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}

function TreatmentEffectivenessChart({
    treatments,
}: {
    treatments: TreatmentEffectivenessSummary[];
}) {
    const data = treatments.map((item) => ({
        treatment: item.treatment_name,
        recovery: Number(
            item.average_recovery_score.toFixed(1),
        ),
        readmission: Number(
            (item.readmission_rate * 100).toFixed(1),
        ),
    }));

    return (
        <section className="hf-panel">
            <SectionHeader
                title="Treatment effectiveness comparison"
                description="Average recovery score across recorded treatment groups."
            />

            <div className="h-[340px] px-5 pb-5">
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                >
                    <BarChart
                        data={data}
                        margin={{
                            top: 15,
                            right: 20,
                            left: 0,
                            bottom: 65,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            dataKey="treatment"
                            angle={-25}
                            textAnchor="end"
                            interval={0}
                            tick={{ fontSize: 11 }}
                        />

                        <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 12 }}
                        />

                        <Tooltip />

                        <Bar
                            dataKey="recovery"
                            name="Average recovery"
                            fill="#1e3a5f"
                            radius={[2, 2, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}

function RiskDistributionChart({
    distribution,
}: {
    distribution: HospitalAnalyticsSummary['risk_distribution'];
}) {
    const data = [
        {
            name: 'Low',
            value: distribution.low,
        },
        {
            name: 'Medium',
            value: distribution.medium,
        },
        {
            name: 'High',
            value: distribution.high,
        },
    ];

    return (
        <section className="hf-panel">
            <SectionHeader
                title="Risk distribution"
                description="Patients grouped by their latest recorded risk category."
            />

            <div className="h-[300px]">
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                >
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={95}
                            label={({ name, value }) =>
                                `${name}: ${value}`
                            }
                        >
                            <Cell fill="#64748b" />
                            <Cell fill="#b45309" />
                            <Cell fill="#b91c1c" />
                        </Pie>

                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}

function TreatmentSection({
    treatments,
}: {
    treatments: TreatmentEffectivenessSummary[];
}) {
    return (
        <section className="mt-7 hf-panel">
            <SectionHeader
                title="Treatment effectiveness"
                description="Aggregated treatment outcome and readmission statistics."
            />

            {treatments.length === 0 ? (
                <EmptyState
                    text="No treatment outcome records are currently available."
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <TableHead>
                                    Treatment
                                </TableHead>

                                <TableHead>
                                    Patients treated
                                </TableHead>

                                <TableHead>
                                    Average recovery
                                </TableHead>

                                <TableHead>
                                    Readmission rate
                                </TableHead>
                            </tr>
                        </thead>

                        <tbody>
                            {treatments.map(
                                (treatment) => (
                                    <tr
                                        key={
                                            treatment.treatment_name
                                        }
                                        className="hf-table-row"
                                    >
                                        <td className="px-5 py-4 text-sm font-medium text-slate-800">
                                            {
                                                treatment.treatment_name
                                            }
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {
                                                treatment.patients_treated
                                            }
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {treatment.average_recovery_score.toFixed(
                                                1,
                                            )}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {(
                                                treatment.readmission_rate *
                                                100
                                            ).toFixed(
                                                1,
                                            )}
                                            %
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function MedicationOutcomeSection({
    outcomes,
}: {
    outcomes: MedicationOutcomeSummary[];
}) {
    return (
        <section className="mt-7 hf-panel">
            <SectionHeader
                title="Medication outcome analysis"
                description="Aggregated outcomes grouped by whether a medication change was recorded."
            />

            {outcomes.length === 0 ? (
                <EmptyState
                    text="No medication outcome data is currently available."
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <TableHead>
                                    Medication change
                                </TableHead>

                                <TableHead>
                                    Patients treated
                                </TableHead>

                                <TableHead>
                                    Average recovery
                                </TableHead>

                                <TableHead>
                                    Readmission rate
                                </TableHead>

                                <TableHead>
                                    Improved
                                </TableHead>

                                <TableHead>
                                    Stable
                                </TableHead>

                                <TableHead>
                                    Partial recovery
                                </TableHead>
                            </tr>
                        </thead>

                        <tbody>
                            {outcomes.map(
                                (outcome) => (
                                    <tr
                                        key={
                                            outcome.medication_change
                                                ? 'changed'
                                                : 'unchanged'
                                        }
                                        className="hf-table-row"
                                    >
                                        <td className="px-5 py-4 text-sm font-medium text-slate-800">
                                            {outcome.medication_change
                                                ? 'Changed'
                                                : 'No change'}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {
                                                outcome.patients_treated
                                            }
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {outcome.average_recovery_score.toFixed(
                                                1,
                                            )}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {(
                                                outcome.readmission_rate *
                                                100
                                            ).toFixed(
                                                1,
                                            )}
                                            %
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {
                                                outcome.improved_count
                                            }
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {
                                                outcome.stable_count
                                            }
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {
                                                outcome.partial_recovery_count
                                            }
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="hf-table-row px-5 py-3">
                <p className="text-xs leading-5 text-slate-400">
                    These are aggregated observational
                    statistics from the available records.
                    They do not establish that medication
                    changes caused differences in outcomes.
                </p>
            </div>
        </section>
    );
}

function RecoverySection({
    trends,
}: {
    trends: RecoveryTrend[];
}) {
    return (
        <section className="mt-7 hf-panel">
            <SectionHeader
                title="Recovery trends"
                description="Average recovery score grouped by admission week."
            />

            {trends.length === 0 ? (
                <EmptyState
                    text="No recovery trend data is currently available."
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <TableHead>
                                    Week
                                </TableHead>

                                <TableHead>
                                    Average recovery score
                                </TableHead>
                            </tr>
                        </thead>

                        <tbody>
                            {trends.map((trend) => (
                                <tr
                                    key={trend.week}
                                    className="hf-table-row"
                                >
                                    <td className="px-5 py-4 text-sm font-medium text-slate-800">
                                        {trend.week}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        {trend.average_recovery_score.toFixed(
                                            1,
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function ReadmissionSection({
    trends,
}: {
    trends: ReadmissionTrend[];
}) {
    return (
        <section className="mt-7 hf-panel">
            <SectionHeader
                title="Readmission trends"
                description="Monthly admission volume and readmission rate."
            />

            {trends.length === 0 ? (
                <EmptyState
                    text="No readmission trend data is currently available."
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <TableHead>
                                    Period
                                </TableHead>

                                <TableHead>
                                    Admissions
                                </TableHead>

                                <TableHead>
                                    Readmissions
                                </TableHead>

                                <TableHead>
                                    Readmission rate
                                </TableHead>
                            </tr>
                        </thead>

                        <tbody>
                            {trends.map((trend) => (
                                <tr
                                    key={trend.period}
                                    className="hf-table-row"
                                >
                                    <td className="px-5 py-4 text-sm font-medium text-slate-800">
                                        {trend.period}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        {trend.admissions}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        {trend.readmissions}
                                    </td>

                                    <td className="px-5 py-4 text-sm text-slate-600">
                                        {(
                                            trend.readmission_rate *
                                            100
                                        ).toFixed(
                                            1,
                                        )}
                                        %
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function PopulationHealthSection({
    data,
}: {
    data: PopulationHealthResponse | null;
}) {
    return (
        <section className="mt-7 hf-panel">
            <SectionHeader
                title="Population health"
                description="Aggregated statistics by age group. No patient-level records are displayed."
            />

            {!data ||
                data.cohorts.length === 0 ? (
                <EmptyState
                    text="No population-health data is currently available."
                />
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <TableHead>
                                        Age group
                                    </TableHead>

                                    <TableHead>
                                        Patients
                                    </TableHead>

                                    <TableHead>
                                        Admissions
                                    </TableHead>

                                    <TableHead>
                                        Readmission rate
                                    </TableHead>
                                </tr>
                            </thead>

                            <tbody>
                                {data.cohorts.map(
                                    (cohort) => (
                                        <tr
                                            key={
                                                cohort.age_group ??
                                                'unknown'
                                            }
                                            className="hf-table-row"
                                        >
                                            <td className="px-5 py-4 text-sm font-medium text-slate-800">
                                                {cohort.age_group ??
                                                    'Unknown'}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {
                                                    cohort.patient_count
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {
                                                    cohort.admission_count
                                                }
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {(
                                                    cohort.readmission_rate *
                                                    100
                                                ).toFixed(
                                                    1,
                                                )}
                                                %
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>

                    {data.generated_at && (
                        <p className="hf-table-row px-5 py-3 text-xs text-slate-400">
                            Generated{' '}
                            {formatDateTime(
                                data.generated_at,
                            )}
                        </p>
                    )}
                </>
            )}
        </section>
    );
}

function AnalyticsSidebar() {
    return (
        <>
            <aside className="hf-sidebar">
                <div className="hf-sidebar-inner">
                    <div className="hf-sidebar-brand">
                        <p>HealthForecast</p>
                        <p>Clinical workspace</p>
                    </div>
                    <nav className="hf-sidebar-nav">
                        <Link href="/" className="hf-nav-item">Overview</Link>
                        <Link href="/risk" className="hf-nav-item">Risk prediction</Link>
                        <Link href="/analytics" className="hf-nav-item hf-nav-active">Healthcare analytics</Link>
                    </nav>
                    <div className="hf-sidebar-footer">
                        <p>Healthcare analytics</p>
                        <p>Hospital performance</p>
                    </div>
                </div>
            </aside>
            <nav className="hf-mobile-nav" aria-label="Primary navigation">
                <Link href="/">Overview</Link>
                <Link href="/risk">Risk prediction</Link>
                <Link href="/analytics" className="active">Analytics</Link>
            </nav>
        </>
    );
}

function SectionTitle({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
                {title}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
                {description}
            </p>
        </div>
    );
}

function SectionHeader({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="hf-section-head">
            <h3 className="text-sm font-semibold text-slate-900">
                {title}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
                {description}
            </p>
        </div>
    );
}

function Metric({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div className="bg-white hf-kpi">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {label}
            </p>

            <p className="mt-2 hf-page-title">
                {value}
            </p>
        </div>
    );
}

function TableHead({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <th className="hf-table-head">
            {children}
        </th>
    );
}

function EmptyPanel({
    title,
    text,
}: {
    title: string;
    text: string;
}) {
    return (
        <div className="hf-panel px-5 py-10 text-center">
            <h3 className="text-sm font-semibold text-slate-800">
                {title}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
                {text}
            </p>
        </div>
    );
}

function EmptyState({
    text,
}: {
    text: string;
}) {
    return (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
            {text}
        </div>
    );
}

function LoadingScreen({
    text,
}: {
    text: string;
}) {
    return (
        <div className="flex min-h-[180px] items-center justify-center">
            <p className="text-sm text-slate-500">
                {text}
            </p>
        </div>
    );
}

function formatRole(role: string) {
    return role
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase(),
        );
}

function formatDateTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Not available';
    }

    return date.toLocaleString();
}