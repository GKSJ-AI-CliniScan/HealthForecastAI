'use client';

import React, { useState } from 'react';
import { ClinicalInsight, ClinicalInsightPriority } from '@/types';
import { Card } from '@/components/ui/Card';
import {
  StethoscopeIcon,
  ClockIcon,
  CheckCircle2Icon,
  CircleIcon,
  AlertCircleIcon,
} from '@/components/ui/Icons';

export interface ClinicalInsightsPanelProps {
  insights: ClinicalInsight[];
  className?: string;
}

export function ClinicalInsightsPanel({
  insights,
  className = '',
}: ClinicalInsightsPanelProps) {
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  const toggleComplete = (id: string) => {
    setCompletedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const priorityBadges: Record<ClinicalInsightPriority, { text: string; style: string }> = {
    critical: {
      text: 'Critical Priority',
      style: 'bg-coral-100 text-coral-800 dark:bg-coral-950/80 dark:text-coral-200 border-coral-300 dark:border-coral-800',
    },
    high: {
      text: 'High Priority',
      style: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300 dark:border-amber-800',
    },
    medium: {
      text: 'Medium Priority',
      style: 'bg-brand-50 text-brand-800 dark:bg-brand-950/80 dark:text-brand-200 border-brand-200 dark:border-brand-800',
    },
    low: {
      text: 'Routine',
      style: 'bg-sage-50 text-sage-800 dark:bg-sage-950/80 dark:text-sage-200 border-sage-200 dark:border-sage-800',
    },
  };

  const completedCount = Object.values(completedMap).filter(Boolean).length;
  const totalCount = insights.length;

  return (
    <Card className={`p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm ${className}`}>
      {/* Header with Completion Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-border/60 pb-4 dark:border-warm-border/60">
        <div>
          <div className="flex items-center gap-2">
            <StethoscopeIcon className="h-4 w-4 text-brand-500" />
            <h3 className="text-base font-bold tracking-tight text-warm-text dark:text-warm-text">
              Clinical Decision Support & Care Pathway Recommendations
            </h3>
          </div>
          <p className="text-xs text-warm-text-muted dark:text-warm-text-muted mt-0.5">
            Automated evidence-based interventions tailored to mitigate this patient&apos;s active risk drivers.
          </p>
        </div>

        {/* Action Completion Tracker */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-xs font-semibold text-warm-text-muted dark:text-warm-text-muted">
            Checklist Progress:
          </span>
          <span className="rounded-full bg-brand-50 dark:bg-brand-950/60 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
            {completedCount} of {totalCount} Addressed
          </span>
        </div>
      </div>

      {/* Insights List */}
      <div className="mt-4 space-y-3.5">
        {insights.map((insight) => {
          const isDone = !!completedMap[insight.id];
          const badge = priorityBadges[insight.priority] || priorityBadges.medium;

          return (
            <div
              key={insight.id}
              className={`rounded-xl border p-4.5 transition-all ${
                isDone
                  ? 'border-sage-300/80 bg-sage-50/40 dark:border-sage-800/60 dark:bg-sage-950/20 opacity-80'
                  : 'border-warm-border/70 bg-white dark:bg-warm-card hover:border-brand-300 dark:hover:border-warm-border shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Interactive Completion Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleComplete(insight.id)}
                    title={isDone ? 'Mark as pending' : 'Mark as completed in care plan'}
                    className="mt-0.5 shrink-0 rounded-lg p-1 text-warm-text-muted hover:text-brand-500 transition-colors focus:outline-none"
                  >
                    {isDone ? (
                      <CheckCircle2Icon className="h-5 w-5 text-sage-600 dark:text-sage-400" />
                    ) : (
                      <CircleIcon className="h-5 w-5 text-warm-text-light hover:text-warm-text" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badge.style}`}
                      >
                        {badge.text}
                      </span>
                      <h4
                        className={`text-sm font-bold text-warm-text dark:text-warm-text ${
                          isDone ? 'line-through text-warm-text-muted' : ''
                        }`}
                      >
                        {insight.title}
                      </h4>
                    </div>

                    {/* Recommendation Text */}
                    <p className="mt-1.5 text-xs font-medium text-warm-text dark:text-warm-text leading-relaxed">
                      {insight.recommendation}
                    </p>

                    {/* Clinical Rationale */}
                    <div className="mt-2.5 rounded-lg bg-warm-neutral/30 dark:bg-warm-neutral/15 p-2.5 border border-warm-border/40 text-[11px] text-warm-text-muted dark:text-warm-text-muted">
                      <div className="flex items-start gap-1.5">
                        <AlertCircleIcon className="h-3.5 w-3.5 text-brand-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-warm-text dark:text-warm-text">Clinical Rationale:</strong>{' '}
                          {insight.rationale}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeframe Pill */}
                {insight.suggestedTimeframe && (
                  <div className="shrink-0 hidden sm:flex items-center gap-1 rounded-lg bg-warm-neutral/40 dark:bg-warm-neutral/20 px-2.5 py-1 text-[11px] font-semibold text-warm-text-muted">
                    <ClockIcon className="h-3.5 w-3.5 text-brand-500" />
                    <span>{insight.suggestedTimeframe}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
