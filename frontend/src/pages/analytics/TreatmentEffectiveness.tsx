import React, { useState } from 'react';
import {
  Stethoscope,
  Download,
  CheckCircle,
  Award,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';
import { ClinicalDisclaimer } from '@/components/common/ClinicalDisclaimer';
import { TreatmentEffectivenessChart } from '@/components/analytics/TreatmentEffectivenessChart';
import { TreatmentOutcomeChart } from '@/components/analytics/TreatmentOutcomeChart';
import {
  useTreatmentAnalytics,
  useExportTreatments,
} from '@/features/analytics/analytics.hooks';
import { TreatmentAnalyticsFilters } from '@/features/analytics/analytics.types';
import { formatPercentage, formatScore } from '@/features/analytics/analytics.utils';

export const TreatmentEffectiveness: React.FC = () => {
  const [filters] = useState<TreatmentAnalyticsFilters>({});
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useTreatmentAnalytics(filters);
  const exportMutation = useExportTreatments();

  const handleExport = async () => {
    setExportMessage('Preparing report...');
    try {
      await exportMutation.mutateAsync();
      setExportMessage('Report exported successfully.');
      setTimeout(() => setExportMessage(null), 3000);
    } catch {
      setExportMessage('Failed to export treatment report.');
      setTimeout(() => setExportMessage(null), 3000);
    }
  };

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (isError || !data) return <ErrorAlert message="Unable to load treatment effectiveness analytics." onRetry={refetch} />;

  const improvedCount = data.outcome_distribution['IMPROVED'] || 0;

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Treatment Effectiveness Analysis"
          subtitle="Evaluation of therapeutic outcomes, modality response rates, and completion metrics."
        />
        <div className="flex items-center gap-3">
          {exportMessage && (
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800">
              {exportMessage}
            </span>
          )}
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-teal-600" />
            {exportMutation.isPending ? 'Preparing report...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <ClinicalDisclaimer />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total Treatments</span>
            <Stethoscope className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {data.total_treatments.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">Total recorded clinical therapies</p>
        </Card>

        <Card className="p-5 border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Completed Treatments</span>
            <CheckCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {data.completed_treatments.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">
            {data.total_treatments > 0
              ? `${Math.round((data.completed_treatments / data.total_treatments) * 100)}% completion rate`
              : 'N/A'}
          </p>
        </Card>

        <Card className="p-5 border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Mean Effectiveness</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {formatScore(data.average_effectiveness)}
          </div>
          <p className="text-xs text-slate-400">Average clinical response score</p>
        </Card>

        <Card className="p-5 border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Improved Outcomes</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {improvedCount.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">
            {data.effectiveness_rate !== null && data.effectiveness_rate !== undefined
              ? `${formatPercentage(data.effectiveness_rate)} effectiveness rate`
              : 'Pending evaluations'}
          </p>
        </Card>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TreatmentOutcomeChart outcomeDistribution={data.outcome_distribution} />
        <TreatmentEffectivenessChart data={data.type_distribution} />
      </div>

      {/* Modality Table */}
      <Card className="p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Treatment Modality Performance Summary
          </h3>
          <p className="text-xs text-slate-500">
            Aggregated volume and mean outcome score by clinical therapy modality
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Treatment Modality</th>
                <th className="py-3 px-4">Prescribed Treatments</th>
                <th className="py-3 px-4">Share of Total</th>
                <th className="py-3 px-4">Average Effectiveness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.type_distribution.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No modalities recorded.
                  </td>
                </tr>
              ) : (
                data.type_distribution.map((t) => (
                  <tr key={t.treatment_type} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {t.treatment_type}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {t.count.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {data.total_treatments > 0
                        ? `${((t.count / data.total_treatments) * 100).toFixed(1)}%`
                        : '0%'}
                    </td>
                    <td className="py-3.5 px-4">
                      {t.avg_effectiveness !== null && t.avg_effectiveness !== undefined ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {Math.round(t.avg_effectiveness)} / 100
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No score</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
