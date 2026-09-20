import type { RiskDriver } from '@/types';

interface RiskDriverListProps {
    drivers: RiskDriver[];
}

export function RiskDriverList({ drivers }: RiskDriverListProps) {
    if (drivers.length === 0) {
        return (
            <p className="text-sm text-slate-500">
                No model-derived drivers are available for this assessment.
            </p>
        );
    }

    return (
        <div className="space-y-2.5">
            {drivers.map((driver, index) => {
                const increasesRisk = driver.direction === 'increases_risk';

                return (
                    <div
                        key={`${driver.feature}-${index}`}
                        className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                    {driver.feature}
                                </p>
                                <p
                                    className={`mt-1 text-xs font-medium ${increasesRisk ? 'text-red-700' : 'text-emerald-700'
                                        }`}
                                >
                                    {increasesRisk
                                        ? 'Increases predicted risk'
                                        : 'Decreases predicted risk'}
                                </p>
                            </div>

                            <span
                                className={`shrink-0 font-mono text-xs font-semibold ${increasesRisk ? 'text-red-700' : 'text-emerald-700'
                                    }`}
                            >
                                {driver.contribution > 0 ? '+' : ''}
                                {driver.contribution.toFixed(3)}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
