import type { RiskDriver } from '@/types';

interface RiskDriverListProps {
    drivers: RiskDriver[];
}

export function RiskDriverList({ drivers }: RiskDriverListProps) {
    return (
        <div className="space-y-3">
            {drivers.map((driver, index) => {
                const increasesRisk = driver.direction === 'increases_risk';

                return (
                    <div
                        key={`${driver.feature}-${index}`}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-semibold text-slate-200">
                                    {driver.feature}
                                </p>

                                <p
                                    className={`mt-1 text-xs font-semibold ${increasesRisk
                                            ? 'text-red-300'
                                            : 'text-emerald-300'
                                        }`}
                                >
                                    {increasesRisk
                                        ? 'Increases predicted risk'
                                        : 'Decreases predicted risk'}
                                </p>
                            </div>

                            <span className="font-mono text-xs text-slate-500">
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