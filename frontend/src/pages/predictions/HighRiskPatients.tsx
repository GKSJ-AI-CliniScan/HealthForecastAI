import React, { useState } from 'react';
import {
  useHighRiskPatients,
  useGeneratePrediction,
} from '@/features/predictions/prediction.hooks';
import { HighRiskPatientTable } from '@/components/predictions/HighRiskPatientTable';
import { PredictionDisclaimer } from '@/components/predictions/PredictionDisclaimer';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AlertOctagon, Filter } from 'lucide-react';

export const HighRiskPatients: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const {
    data: response,
    isLoading,
    refetch,
  } = useHighRiskPatients({
    page,
    page_size: 20,
    category: categoryFilter,
  });

  const generateMutation = useGeneratePrediction();

  const handleGenerate = async (patientId: string) => {
    try {
      await generateMutation.mutateAsync({ patient_id: patientId });
      refetch();
    } catch (err) {
      console.error('Failed to regenerate prediction:', err);
    }
  };

  const totalPatients = response?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="High-Risk Inpatient Watchlist"
        subtitle="Active surveillance of patients with elevated readmission probabilities (Score 51–100)."
        badge={
          <Badge variant="rose">
            <AlertOctagon className="w-3.5 h-3.5 mr-1" />
            {totalPatients} Flagged Inpatients
          </Badge>
        }
      />

      <PredictionDisclaimer />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Severity Filter:
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant={categoryFilter === undefined ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setCategoryFilter(undefined);
                setPage(1);
              }}
            >
              All High Risk
            </Button>
            <Button
              variant={categoryFilter === 'CRITICAL' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setCategoryFilter('CRITICAL');
                setPage(1);
              }}
            >
              Critical Only (76–100)
            </Button>
            <Button
              variant={categoryFilter === 'HIGH' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setCategoryFilter('HIGH');
                setPage(1);
              }}
            >
              High Only (51–75)
            </Button>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing page {page} of {response?.total_pages || 1}
        </div>
      </div>

      {/* Table */}
      <HighRiskPatientTable
        patients={response?.items || []}
        isLoading={isLoading}
        onGeneratePrediction={handleGenerate}
        isGenerating={generateMutation.isPending}
      />

      {/* Pagination */}
      {response && response.total_pages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs font-bold px-3 text-slate-500">
            {page} / {response.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= response.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
