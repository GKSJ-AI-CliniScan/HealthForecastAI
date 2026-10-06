'use client';

import React, { useState } from 'react';
import { RiskFactor, RiskFactorImpact } from '@/types';
import { Card } from '@/components/ui/Card';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  FilterIcon,
  ActivityIcon,
} from '@/components/ui/Icons';

export interface RiskFactorBreakdownProps {
  riskFactors: RiskFactor[];
  className?: string;
}

export function RiskFactorBreakdown({
  riskFactors,
  className = '',
}: RiskFactorBreakdownProps) {
  const [filter, setFilter] = useState<'all' | RiskFactorImpact>('all');

  const filteredFactors = riskFactors.filter((rf) => {
    if (filter === 'all') return true;
    return rf.impact === filter;
  });

  const categoryBadges: Record<string, string> = {
    utilization: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    clinical: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border-brand-200 dark:border-brand-800',
    medication: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    history: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    demographic: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  };

  return (
    <Card className={`p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm ${className}`}>
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-border/60 pb-4 dark:border-warm-border/60">
        <div>
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-brand-500" />
            <h3 className="text-base font-bold tracking-tight text-warm-text dark:text-warm-text">
              Contributing Risk Factors (SHAP Feature Attribution)
            </h3>
          </div>
          <p className="text-xs text-warm-text-muted dark:text-warm-text-muted mt-0.5">
            Key clinical biomarkers, medication indices, and utilization variables influencing readmission probability.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <FilterIcon className="h-3.5 w-3.5 text-warm-text-light mr-1" />
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'bg-warm-neutral/50 text-warm-text-muted hover:bg-warm-neutral hover:text-warm-text dark:bg-warm-neutral/20 dark:text-warm-text-muted'
            }`}
          >
            All ({riskFactors.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('increase')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              filter === 'increase'
                ? 'bg-coral-600 text-white shadow-xs'
                : 'bg-warm-neutral/50 text-warm-text-muted hover:bg-warm-neutral hover:text-warm-text dark:bg-warm-neutral/20 dark:text-warm-text-muted'
            }`}
          >
            Risk Drivers ({riskFactors.filter((f) => f.impact === 'increase').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('decrease')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              filter === 'decrease'
                ? 'bg-sage-600 text-white shadow-xs'
                : 'bg-warm-neutral/50 text-warm-text-muted hover:bg-warm-neutral hover:text-warm-text dark:bg-warm-neutral/20 dark:text-warm-text-muted'
            }`}
          >
            Protective ({riskFactors.filter((f) => f.impact === 'decrease').length})
          </button>
        </div>
      </div>

      {/* Risk Factors List */}
      <div className="mt-4 space-y-3.5">
        {filteredFactors.length === 0 ? (
          <div className="py-8 text-center text-xs text-warm-text-muted">
            No factors matching the selected filter.
          </div>
        ) : (
          filteredFactors.map((factor) => {
            const isIncrease = factor.impact === 'increase';
            const badgeClass =
              categoryBadges[factor.category] ||
              'bg-warm-neutral text-warm-text border-warm-border';

            return (
              <div
                key={factor.id}
                className="rounded-xl border border-warm-border/60 bg-warm-neutral/20 dark:bg-warm-neutral/10 p-4 transition-all hover:border-warm-border hover:shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}
                    >
                      {factor.category}
                    </span>
                    <h4 className="text-sm font-bold text-warm-text dark:text-warm-text">
                      {factor.factorName}
                    </h4>
                  </div>

                  {/* Impact Tag with Percentage */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                        isIncrease
                          ? 'bg-coral-50 dark:bg-coral-950/60 text-coral-700 dark:text-coral-300 border border-coral-200 dark:border-coral-800'
                          : 'bg-sage-50 dark:bg-sage-950/60 text-sage-700 dark:text-sage-300 border border-sage-200 dark:border-sage-800'
                      }`}
                    >
                      {isIncrease ? (
                        <>
                          <TrendingUpIcon className="h-3.5 w-3.5 text-coral-600 dark:text-coral-400" />
                          <span>+{factor.weightPercent}% Risk Weight</span>
                        </>
                      ) : (
                        <>
                          <TrendingDownIcon className="h-3.5 w-3.5 text-sage-600 dark:text-sage-400" />
                          <span>-{factor.weightPercent}% Protective Weight</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Description & Clinical Context */}
                <p className="mt-2 text-xs text-warm-text dark:text-warm-text leading-relaxed">
                  {factor.description}
                </p>

                {/* Patient Value vs Benchmark */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] pt-2 border-t border-warm-border/40 text-warm-text-muted dark:text-warm-text-muted">
                  <div className="flex items-center gap-4">
                    <span>
                      Patient Value: <strong className="text-warm-text dark:text-warm-text font-semibold">{factor.patientValue}</strong>
                    </span>
                    {factor.benchmarkRange && (
                      <span>
                        Clinical Benchmark: <strong className="text-warm-text dark:text-warm-text">{factor.benchmarkRange}</strong>
                      </span>
                    )}
                  </div>

                  {/* Proportional Bar */}
                  <div className="flex items-center gap-2 w-full sm:w-40">
                    <div className="h-1.5 flex-1 rounded-full bg-warm-neutral/60 dark:bg-warm-neutral/30 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isIncrease ? 'bg-coral-500' : 'bg-sage-500'
                        }`}
                        style={{ width: `${Math.min(100, factor.weightPercent * 2.5)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-semibold">
                      {factor.weightPercent}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
