
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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

const HOSPITAL_ANALYTICS_PERMISSION = 'hospital_analytics:read';
const TREATMENT_PERMISSION = 'treatment_report:read';
const POPULATION_HEALTH_PERMISSION = 'population_health:read';

const CHART_COLORS = {
    blue: '#3976c5',
    teal: '#249b88',
    amber: '#d99a37',
    red: '#d65b5b',
    slate: '#91a1b5',
    grid: '#edf1f6',
    text: '#758197',
};

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
        (permission: string): boolean =>
            Boolean(currentUser?.permissions?.includes(permission)),
        [currentUser],
    );

    const loadAnalytics = useCallback(async () => {
        if (!token || !currentUser) return;

        setLoading(true);
        setError('');

        try {
            const requests: Promise<unknown>[] = [];

            if (hasPermission(HOSPITAL_ANALYTICS_PERMISSION)) {
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

            if (hasPermission(TREATMENT_PERMISSION)) {
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

            if (hasPermission(POPULATION_HEALTH_PERMISSION)) {
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
    }, [token, currentUser, hasPermission]);

    useEffect(() => {
        void loadAnalytics();
    }, [loadAnalytics]);

    if (authLoading) {
        return <LoadingScreen text="Loading clinical workspace..." />;
    }

    if (!token || !currentUser) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-5">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-9 text-center shadow-sm">
                    <BrandMark />
                    <h1 className="mt-6 text-xl font-semibold text-slate-900">
                        Authentication required
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Sign in to access healthcare analytics.
                    </p>
                    <Link href="/" className="hf-button hf-button-primary mt-6">
                        Return to sign in
                    </Link>
                </div>
            </main>
        );
    }

    const canViewHospital = hasPermission(HOSPITAL_ANALYTICS_PERMISSION);
    const canViewTreatment = hasPermission(TREATMENT_PERMISSION);
    const canViewPopulation = hasPermission(POPULATION_HEALTH_PERMISSION);

    return (
        <main className="hf-page">
            <div className="hf-shell">
                <AnalyticsSidebar />

                <div className="hf-main min-w-0">
                    <header className="hf-header">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="hf-header-eyebrow">Clinical workspace</p>
                                <p className="text-sm font-medium text-slate-700">
                                    Healthcare analytics
                                </p>
                            </div>

                            <div className="flex items-center gap-3 sm:gap-5">
                                <div className="hidden text-right sm:block">
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

                    <AnalyticsMobileNav />

                    <div className="hf-content">
                        <section className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                        <AnalyticsIcon />
                                    </span>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">
                                        Reports & insights
                                    </span>
                                </div>

                                <h1 className="hf-page-title">
                                    Healthcare analytics
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                    Understand hospital performance, readmission patterns,
                                    treatment outcomes, and population health from your
                                    available clinical data.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Clinical reports
                                </span>
                                <button
                                    type="button"
                                    onClick={() => void loadAnalytics()}
                                    disabled={loading}
                                    className="hf-button hf-button-secondary"
                                >
                                    <RefreshIcon />
                                    <span>{loading ? 'Refreshing...' : 'Refresh data'}</span>
                                </button>
                            </div>
                        </section>

                        {error && (
                            <div
                                role="alert"
                                className="hf-alert hf-alert-danger mb-6 flex items-start justify-between gap-3"
                            >
                                <span>{error}</span>
                                <button
                                    type="button"
                                    onClick={() => setError('')}
                                    className="shrink-0 font-semibold"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <AnalyticsLoading />
                        ) : (
                            <div className="space-y-7">
                                {canViewHospital && (
                                    <>
                                        <HospitalSummary summary={summary} />

                                        {summary && (
                                            <div className="grid min-w-0 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                                                <RiskDistributionChart
                                                    distribution={summary.risk_distribution}
                                                />
                                                {readmissionTrends.length > 0 ? (
                                                    <ReadmissionTrendChart
                                                        trends={readmissionTrends}
                                                    />
                                                ) : (
                                                    <EmptyPanel
                                                        title="Readmission trends unavailable"
                                                        text="No readmission trend records are currently available."
                                                    />
                                                )}
                                            </div>
                                        )}

                                        <ReadmissionSection trends={readmissionTrends} />
                                    </>
                                )}

                                {canViewTreatment && (
                                    <>
                                        {treatments.length > 0 && (
                                            <TreatmentEffectivenessChart
                                                treatments={treatments}
                                            />
                                        )}

                                        {recoveryTrends.length > 0 && (
                                            <RecoveryTrendChart trends={recoveryTrends} />
                                        )}

                                        <TreatmentSection treatments={treatments} />

                                        <MedicationOutcomeSection
                                            outcomes={medicationOutcomes}
                                        />

                                        <RecoverySection trends={recoveryTrends} />
                                    </>
                                )}

                                {canViewPopulation && (
                                    <PopulationHealthSection data={populationHealth} />
                                )}

                                {!canViewHospital &&
                                    !canViewTreatment &&
                                    !canViewPopulation && (
                                        <EmptyPanel
                                            title="Analytics access unavailable"
                                            text="Your current role does not have permission to view the available analytics reports."
                                        />
                                    )}
                            </div>
                        )}

                        <footer className="mt-9 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-slate-400">
                                HealthForecast AI · Clinical analytics
                            </p>
                            <p className="max-w-xl text-xs leading-5 text-slate-400 sm:text-right">
                                Aggregated reports support clinical review and operational
                                analysis. They do not replace professional medical judgment.
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
        </main>
    );
}

/* Navigation */

function AnalyticsSidebar() {
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

                <nav className="hf-sidebar-nav" aria-label="Main navigation">
                    <Link href="/" className="hf-nav-item">
                        <OverviewIcon />
                        <span>Overview</span>
                    </Link>

                    <Link href="/risk" className="hf-nav-item">
                        <ActivityIcon />
                        <span>Risk prediction</span>
                    </Link>

                    <Link
                        href="/analytics"
                        className="hf-nav-item hf-nav-active"
                        aria-current="page"
                    >
                        <AnalyticsIcon />
                        <span>Healthcare analytics</span>
                    </Link>
                </nav>

                <div className="mt-auto px-4 pb-4">
                    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-700">
                                <ShieldIcon />
                            </span>
                            <div>
                                <p className="text-xs font-semibold text-slate-700">
                                    Clinical workspace
                                </p>
                                <p className="mt-1 text-[10px] text-slate-500">
                                    Healthcare insights
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

function AnalyticsMobileNav() {
    return (
        <nav className="hf-mobile-nav" aria-label="Main navigation">
            <Link href="/">Overview</Link>
            <Link href="/risk">Risk prediction</Link>
            <Link href="/analytics" className="active" aria-current="page">
                Analytics
            </Link>
        </nav>
    );
}

/* Hospital overview */

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
                description="A snapshot of the available hospital performance indicators."
            />

            <div className="hf-kpi-grid md:grid-cols-2 xl:grid-cols-4">
                <Metric
                    label="Total patients"
                    value={formatNumber(summary.total_patients)}
                    detail="Patient records"
                    accent="blue"
                />
                <Metric
                    label="Total admissions"
                    value={formatNumber(summary.total_admissions)}
                    detail="Recorded admissions"
                    accent="slate"
                />
                <Metric
                    label="Readmission rate"
                    value={`${(summary.readmission_rate * 100).toFixed(1)}%`}
                    detail="Observed readmission rate"
                    accent="amber"
                />
                <Metric
                    label="Average stay"
                    value={`${summary.average_length_of_stay.toFixed(1)} days`}
                    detail="Length of hospital stay"
                    accent="teal"
                />
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
        { name: 'Low risk', value: distribution.low, color: '#299b83' },
        { name: 'Medium risk', value: distribution.medium, color: '#d9a044' },
        { name: 'High risk', value: distribution.high, color: '#d65b5b' },
    ];

    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <section className="hf-panel min-w-0">
            <SectionHeader
                title="Risk distribution"
                description="Patients grouped by their latest recorded risk category."
            />

            <div className="grid gap-2 p-5 sm:grid-cols-[1fr_0.8fr] sm:items-center">
                <div className="h-[230px] min-w-0">
                    {total > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={62}
                                    outerRadius={88}
                                    paddingAngle={3}
                                    stroke="#fff"
                                    strokeWidth={3}
                                >
                                    {data.map((item) => (
                                        <Cell key={item.name} fill={item.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <ChartEmpty message="No risk distribution data." />
                    )}
                </div>

                <div className="space-y-4">
                    {data.map((item) => (
                        <div key={item.name}>
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-2 text-xs text-slate-600">
                                    <span
                                        className="h-2.5 w-2.5 rounded-sm"
                                        style={{ background: item.color }}
                                    />
                                    {item.name}
                                </span>
                                <span className="text-sm font-semibold text-slate-800">
                                    {formatNumber(item.value)}
                                </span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
                                        background: item.color,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* Readmission trends */

function ReadmissionTrendChart({
    trends,
}: {
    trends: ReadmissionTrend[];
}) {
    const data = trends.map((item) => ({
        period: item.period,
        admissions: item.admissions,
        readmissions: item.readmissions,
        rate: Number((item.readmission_rate * 100).toFixed(1)),
    }));

    return (
        <section className="hf-panel min-w-0">
            <SectionHeader
                title="Readmission trends"
                description="Admission volume and readmission rates over time."
                action={<ChartTag>Monthly</ChartTag>}
            />

            <div className="h-[290px] min-w-0 px-3 pb-4 pt-5 sm:px-5">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 2 }}>
                            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                            <XAxis
                                dataKey="period"
                                tick={{ fontSize: 10, fill: CHART_COLORS.text }}
                                axisLine={false}
                                tickLine={false}
                                tickMargin={10}
                            />
                            <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 10, fill: CHART_COLORS.text }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                unit="%"
                                tick={{ fontSize: 10, fill: CHART_COLORS.text }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="admissions"
                                name="Admissions"
                                stroke={CHART_COLORS.blue}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="readmissions"
                                name="Readmissions"
                                stroke={CHART_COLORS.amber}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="rate"
                                name="Readmission rate"
                                stroke={CHART_COLORS.teal}
                                strokeWidth={2}
                                strokeDasharray="5 4"
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <ChartEmpty message="No readmission trends available." />
                )}
            </div>
        </section>
    );
}

function ReadmissionSection({ trends }: { trends: ReadmissionTrend[] }) {
    return (
        <section className="hf-panel">
            <SectionHeader
                title="Readmission report"
                description="Detailed admission counts and observed readmission rates."
                action={<ChartTag>{trends.length} periods</ChartTag>}
            />

            {trends.length === 0 ? (
                <EmptyState text="No readmission records are currently available." />
            ) : (
                <div className="hf-table-wrapper">
                    <table className="w-full min-w-[640px] text-left">
                        <thead>
                            <tr>
                                <TableHead>Period</TableHead>
                                <TableHead>Admissions</TableHead>
                                <TableHead>Readmissions</TableHead>
                                <TableHead>Readmission rate</TableHead>
                            </tr>
                        </thead>
                        <tbody>
                            {trends.map((item) => (
                                <tr key={item.period} className="hf-table-row">
                                    <td className="hf-table-cell font-medium text-slate-800">
                                        {item.period}
                                    </td>
                                    <td className="hf-table-cell">
                                        {formatNumber(item.admissions)}
                                    </td>
                                    <td className="hf-table-cell">
                                        {formatNumber(item.readmissions)}
                                    </td>
                                    <td className="hf-table-cell">
                                        <span className="font-semibold text-slate-800">
                                            {(item.readmission_rate * 100).toFixed(1)}%
                                        </span>
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

/* Treatment analytics */

function TreatmentEffectivenessChart({
    treatments,
}: {
    treatments: TreatmentEffectivenessSummary[];
}) {
    const data = treatments.map((item) => ({
        treatment: item.treatment_name,
        recovery: Number(item.average_recovery_score.toFixed(1)),
        readmission: Number((item.readmission_rate * 100).toFixed(1)),
    }));

    return (
        <section className="hf-panel min-w-0">
            <SectionHeader
                title="Treatment effectiveness"
                description="Average recovery score across recorded treatment groups."
                action={<ChartTag>{treatments.length} treatments</ChartTag>}
            />

            <div className="h-[330px] min-w-0 px-3 pb-5 pt-5 sm:px-5">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 8, right: 10, left: -15, bottom: 45 }}
                        >
                            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                            <XAxis
                                dataKey="treatment"
                                tick={{ fontSize: 10, fill: CHART_COLORS.text }}
                                axisLine={false}
                                tickLine={false}
                                angle={-20}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 10, fill: CHART_COLORS.text }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar
                                dataKey="recovery"
                                name="Average recovery score"
                                fill={CHART_COLORS.blue}
                                radius={[5, 5, 0, 0]}
                                maxBarSize={48}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <ChartEmpty message="No treatment data available." />
                )}
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
        <section className="hf-panel">
            <SectionHeader
                title="Treatment summary"
                description="Aggregated treatment outcomes and readmission statistics."
            />

            {treatments.length === 0 ? (
                <EmptyState text="No treatment outcome records are currently available." />
            ) : (
                <div className="hf-table-wrapper">
                    <table className="w-full min-w-[680px] text-left">
                        <thead>
                            <tr>
                                <TableHead>Treatment</TableHead>
                                <TableHead>Patients treated</TableHead>
                                <TableHead>Average recovery</TableHead>
                                <TableHead>Readmission rate</TableHead>
                            </tr>
                        </thead>
                        <tbody>
                            {treatments.map((item) => (
                                <tr key={item.treatment_name} className="hf-table-row">
                                    <td className="hf-table-cell font-medium text-slate-800">
                                        {item.treatment_name}
                                    </td>
                                    <td className="hf-table-cell">
                                        {formatNumber(item.patients_treated)}
                                    </td>
                                    <td className="hf-table-cell">
                                        <div className="flex items-center gap-3">
                                            <span className="w-10 font-medium text-slate-800">
                                                {item.average_recovery_score.toFixed(1)}
                                            </span>
                                            <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 sm:block">
                                                <div
                                                    className="h-full rounded-full bg-blue-500"
                                                    style={{
                                                        width: `${Math.min(
                                                            Math.max(item.average_recovery_score, 0),
                                                            100,
                                                        )}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="hf-table-cell">
                                        <span className="font-medium text-slate-700">
                                            {(item.readmission_rate * 100).toFixed(1)}%
                                        </span>
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

function MedicationOutcomeSection({
    outcomes,
}: {
    outcomes: MedicationOutcomeSummary[];
}) {
    return (
        <section className="hf-panel">
            <SectionHeader
                title="Medication outcome analysis"
                description="Aggregated outcomes grouped by whether a medication change was recorded."
            />

            {outcomes.length === 0 ? (
                <EmptyState text="No medication outcome data is currently available." />
            ) : (
                <div className="hf-table-wrapper">
                    <table className="w-full min-w-[850px] text-left">
                        <thead>
                            <tr>
                                <TableHead>Medication change</TableHead>
                                <TableHead>Patients treated</TableHead>
                                <TableHead>Average recovery</TableHead>
                                <TableHead>Readmission rate</TableHead>
                                <TableHead>Improved</TableHead>
                                <TableHead>Stable</TableHead>
                                <TableHead>Partial recovery</TableHead>
                            </tr>
                        </thead>
                        <tbody>
                            {outcomes.map((item) => (
                                <tr
                                    key={String(item.medication_change)}
                                    className="hf-table-row"
                                >
                                    <td className="hf-table-cell font-medium text-slate-800">
                                        {item.medication_change ? 'Yes' : 'No'}
                                    </td>
                                    <td className="hf-table-cell">
                                        {formatNumber(item.patients_treated)}
                                    </td>
                                    <td className="hf-table-cell">
                                        {item.average_recovery_score.toFixed(1)}
                                    </td>
                                    <td className="hf-table-cell">
                                        {(item.readmission_rate * 100).toFixed(1)}%
                                    </td>
                                    <td className="hf-table-cell">
                                        {formatNumber(item.improved_count)}
                                    </td>
                                    <td className="hf-table-cell">
                                        {formatNumber(item.stable_count)}
                                    </td>
                                    <td className="hf-table-cell">
                                        {formatNumber(item.partial_recovery_count)}
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

function RecoveryTrendChart({ trends }: { trends: RecoveryTrend[] }) {
    const data = trends.map((item) => ({
        week: item.week,
        recovery: Number(item.average_recovery_score.toFixed(1)),
    }));

    return (
        <section className="hf-panel min-w-0">
            <SectionHeader
                title="Recovery over time"
                description="Weekly average recovery scores across recorded outcomes."
                action={<ChartTag>Weekly</ChartTag>}
            />

            <div className="h-[300px] min-w-0 px-3 pb-5 pt-5 sm:px-5">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 8, right: 10, left: -15, bottom: 2 }}>
                            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                            <XAxis
                                dataKey="week"
                                tick={{ fontSize: 10, fill: CHART_COLORS.text }}
                                axisLine={false}
                                tickLine={false}
                                tickMargin={10}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 10, fill: CHART_COLORS.text }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="recovery"
                                name="Average recovery"
                                stroke={CHART_COLORS.teal}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <ChartEmpty message="No recovery trends available." />
                )}
            </div>
        </section>
    );
}

function RecoverySection({ trends }: { trends: RecoveryTrend[] }) {
    const average =
        trends.length > 0
            ? trends.reduce((sum, item) => sum + item.average_recovery_score, 0) /
            trends.length
            : null;

    const latest = trends.length > 0 ? trends[trends.length - 1] : null;

    return (
        <section className="hf-panel">
            <SectionHeader
                title="Recovery summary"
                description="Summary of the recorded recovery trend data."
            />

            <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
                <div className="bg-white p-5 sm:p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Recorded periods
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {formatNumber(trends.length)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Weeks with available data</p>
                </div>

                <div className="bg-white p-5 sm:p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Mean recovery score
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {average === null ? '—' : average.toFixed(1)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Average of recorded weekly averages
                    </p>
                </div>

                <div className="bg-white p-5 sm:p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Latest recorded week
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {latest?.week ?? '—'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        {latest
                            ? `Recovery score: ${latest.average_recovery_score.toFixed(1)}`
                            : 'No recorded data'}
                    </p>
                </div>
            </div>

            {trends.length > 0 && (
                <div className="hf-table-wrapper">
                    <table className="w-full min-w-[420px] text-left">
                        <thead>
                            <tr>
                                <TableHead>Week</TableHead>
                                <TableHead>Average recovery score</TableHead>
                            </tr>
                        </thead>
                        <tbody>
                            {[...trends].reverse().map((item) => (
                                <tr key={item.week} className="hf-table-row">
                                    <td className="hf-table-cell font-medium text-slate-800">
                                        {item.week}
                                    </td>
                                    <td className="hf-table-cell">
                                        {item.average_recovery_score.toFixed(1)}
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

/* Population health */

function PopulationHealthSection({
    data,
}: {
    data: PopulationHealthResponse | null;
}) {
    const cohorts = data?.cohorts ?? [];

    return (
        <section className="hf-panel">
            <SectionHeader
                title="Population health"
                description="Aggregated patient cohorts and their observed admission outcomes."
                action={<ChartTag>{cohorts.length} cohorts</ChartTag>}
            />

            {cohorts.length === 0 ? (
                <EmptyState text="No population health cohort data is currently available." />
            ) : (
                <>
                    <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Patients represented
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {formatNumber(
                                    cohorts.reduce((sum, item) => sum + item.patient_count, 0),
                                )}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Recorded admissions
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {formatNumber(
                                    cohorts.reduce((sum, item) => sum + item.admission_count, 0),
                                )}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Report generated
                            </p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                {formatDate(data?.generated_at)}
                            </p>
                        </div>
                    </div>

                    <div className="hf-table-wrapper">
                        <table className="w-full min-w-[650px] text-left">
                            <thead>
                                <tr>
                                    <TableHead>Age group</TableHead>
                                    <TableHead>Patients</TableHead>
                                    <TableHead>Admissions</TableHead>
                                    <TableHead>Readmission rate</TableHead>
                                </tr>
                            </thead>
                            <tbody>
                                {cohorts.map((item, index) => (
                                    <tr
                                        key={`${item.age_group ?? 'unknown'}-${index}`}
                                        className="hf-table-row"
                                    >
                                        <td className="hf-table-cell font-medium text-slate-800">
                                            {item.age_group ?? 'Not specified'}
                                        </td>
                                        <td className="hf-table-cell">
                                            {formatNumber(item.patient_count)}
                                        </td>
                                        <td className="hf-table-cell">
                                            {formatNumber(item.admission_count)}
                                        </td>
                                        <td className="hf-table-cell font-medium text-slate-800">
                                            {(item.readmission_rate * 100).toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}

/* Reusable UI */

function BrandMark() {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <MedicalIcon />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-slate-900">
                HealthForecast <span className="text-blue-600">AI</span>
            </span>
        </div>
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
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
                {title}
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        </div>
    );
}

function SectionHeader({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="hf-section-head flex items-start justify-between gap-4">
            <div className="min-w-0">
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

function Metric({
    label,
    value,
    detail,
    accent = 'blue',
}: {
    label: string;
    value: string | number;
    detail?: string;
    accent?: 'blue' | 'slate' | 'amber' | 'teal';
}) {
    const styles = {
        blue: 'bg-blue-50 text-blue-700',
        slate: 'bg-slate-100 text-slate-600',
        amber: 'bg-amber-50 text-amber-700',
        teal: 'bg-emerald-50 text-emerald-700',
    };

    return (
        <div className="hf-kpi">
            <div className="flex items-start justify-between gap-3">
                <p>{label}</p>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles[accent]}`}>
                    <MetricIcon />
                </span>
            </div>
            <p className="mt-3 break-words">{value}</p>
            {detail && (
                <p className="mt-2 text-xs font-normal normal-case tracking-normal text-slate-400">
                    {detail}
                </p>
            )}
        </div>
    );
}

function ChartTag({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500">
            {children}
        </span>
    );
}

function TableHead({ children }: { children: React.ReactNode }) {
    return <th className="hf-table-head">{children}</th>;
}

function EmptyPanel({
    title,
    text,
}: {
    title: string;
    text: string;
}) {
    return (
        <div className="hf-panel p-7 sm:p-9">
            <div className="mx-auto max-w-md text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <AnalyticsIcon />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-slate-800">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
            </div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="px-5 py-10 text-center">
            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <InfoIcon />
            </span>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                {text}
            </p>
        </div>
    );
}

function ChartEmpty({ message }: { message: string }) {
    return (
        <div className="flex h-full min-h-[180px] items-center justify-center px-4 text-center text-sm text-slate-400">
            {message}
        </div>
    );
}

function AnalyticsLoading() {
    return (
        <div className="space-y-7" aria-label="Loading analytics">
            <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="bg-white p-5">
                        <div className="hf-skeleton h-3 w-24" />
                        <div className="hf-skeleton mt-4 h-8 w-32" />
                        <div className="hf-skeleton mt-3 h-3 w-28" />
                    </div>
                ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
                {Array.from({ length: 2 }, (_, index) => (
                    <div key={index} className="hf-panel p-5">
                        <div className="hf-skeleton h-4 w-44" />
                        <div className="hf-skeleton mt-3 h-3 w-64 max-w-full" />
                        <div className="hf-skeleton mt-7 h-56 w-full" />
                    </div>
                ))}
            </div>
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

function ChartTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{
        name?: string;
        value?: number | string;
        color?: string;
    }>;
    label?: string | number;
}) {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg">
            {label !== undefined && (
                <p className="mb-2 text-xs font-semibold text-slate-700">{label}</p>
            )}
            <div className="space-y-1.5">
                {payload.map((item, index) => (
                    <div
                        key={`${item.name ?? 'value'}-${index}`}
                        className="flex items-center justify-between gap-5 text-xs"
                    >
                        <span className="flex items-center gap-2 text-slate-500">
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: item.color ?? CHART_COLORS.blue }}
                            />
                            {item.name ?? 'Value'}
                        </span>
                        <span className="font-semibold text-slate-800">
                            {typeof item.value === 'number'
                                ? Number.isInteger(item.value)
                                    ? item.value.toLocaleString()
                                    : item.value.toFixed(1)
                                : item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* Inline SVG icons */

function MedicalIcon() {
    return (
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.3" opacity=".65" />
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

function AnalyticsIcon() {
    return (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
            <path d="M4 19.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="5" y="11" width="3.5" height="7" rx="1" fill="currentColor" opacity=".65" />
            <rect x="10.25" y="6" width="3.5" height="12" rx="1" fill="currentColor" opacity=".85" />
            <rect x="15.5" y="3.5" width="3.5" height="14.5" rx="1" fill="currentColor" />
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

function MetricIcon() {
    return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
            <path d="M4 17.5 9 12l3 2.5 7-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14.5 6.5H19V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function RefreshIcon() {
    return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
            <path d="M20 7v5h-5M4 17v-5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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

/* Formatting */

function formatNumber(value: number) {
    return value.toLocaleString();
}

function formatRole(role: string) {
    return role.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
    if (!value) return 'Not available';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';

    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
