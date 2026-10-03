
import type { RiskDriver } from '@/types';

interface RiskDriverListProps {
    drivers: RiskDriver[];
}

export function RiskDriverList({ drivers }: RiskDriverListProps) {
    if (drivers.length === 0) {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-5 w-5"
                        aria-hidden="true"
                    >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 11v5" strokeLinecap="round" />
                        <path d="M12 8h.01" strokeLinecap="round" />
                    </svg>
                </div>

                <div>
                    <p className="text-sm font-semibold text-slate-800">
                        No risk drivers available
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                        No model-derived drivers are available for this assessment.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {drivers.map((driver, index) => {
                const increasesRisk = driver.direction === 'increases_risk';
                const isPositive = driver.contribution > 0;

                const accent = increasesRisk
                    ? {
                        icon: 'bg-rose-50 text-rose-600 ring-rose-100',
                        label: 'Increases predicted risk',
                        text: 'text-rose-700',
                        bar: 'bg-rose-500',
                    }
                    : {
                        icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
                        label: 'Decreases predicted risk',
                        text: 'text-emerald-700',
                        bar: 'bg-emerald-500',
                    };

                return (
                    <div
                        key={`${driver.feature}-${index}`}
                        className="group rounded-xl border border-slate-200 bg-white p-4 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50/50"
                    >
                        <div className="flex items-start gap-3">
                            <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${accent.icon}`}
                                aria-hidden="true"
                            >
                                {increasesRisk ? (
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        className="h-4 w-4"
                                    >
                                        <path
                                            d="M7 17 17 7M8 7h9v9"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        className="h-4 w-4"
                                    >
                                        <path
                                            d="M7 7 17 17M8 17h9V8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                                    <div className="min-w-0">
                                        <p className="break-words text-sm font-semibold text-slate-800">
                                            {driver.feature}
                                        </p>
                                        <p className={`mt-1.5 text-xs font-medium ${accent.text}`}>
                                            {accent.label}
                                        </p>
                                    </div>

                                    <span
                                        className={`shrink-0 rounded-md px-2 py-1 font-mono text-xs font-semibold tabular-nums ${isPositive
                                                ? 'bg-rose-50 text-rose-700'
                                                : driver.contribution < 0
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}
                                        title="Model contribution value"
                                    >
                                        {isPositive ? '+' : ''}
                                        {driver.contribution.toFixed(3)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${accent.bar}`}
                                style={{
                                    width: `${Math.min(
                                        100,
                                        Math.max(
                                            4,
                                            Math.abs(driver.contribution) * 100,
                                        ),
                                    )}%`,
                                }}
                                aria-hidden="true"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
