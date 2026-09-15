import React, { useState } from 'react';
import { usePredictions } from '@/features/predictions/prediction.hooks';
import { PredictionHistoryTable } from '@/components/predictions/PredictionHistoryTable';
import { PredictionDisclaimer } from '@/components/predictions/PredictionDisclaimer';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Filter } from 'lucide-react';

export const PredictionHistory: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);

  const { data: response, isLoading } = usePredictions({
    page,
    page_size: 20,
    risk_category: categoryFilter,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prediction Audit & History"
        subtitle="Complete chronological audit trail of all AI readmission risk evaluations conducted across the platform."
      />

      <PredictionDisclaimer />

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Category Filter:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={categoryFilter === undefined ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setCategoryFilter(undefined);
                setPage(1);
              }}
            >
              All
            </Button>
            <Button
              variant={categoryFilter === 'CRITICAL' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setCategoryFilter('CRITICAL');
                setPage(1);
              }}
            >
              Critical
            </Button>
            <Button
              variant={categoryFilter === 'HIGH' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setCategoryFilter('HIGH');
                setPage(1);
              }}
            >
              High
            </Button>
            <Button
              variant={categoryFilter === 'MEDIUM' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setCategoryFilter('MEDIUM');
                setPage(1);
              }}
            >
              Medium
            </Button>
            <Button
              variant={categoryFilter === 'LOW' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                setCategoryFilter('LOW');
                setPage(1);
              }}
            >
              Low
            </Button>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing page {page} of {response?.total_pages || 1} ({response?.total || 0} total)
        </div>
      </div>

      {/* Predictions Table */}
      <PredictionHistoryTable
        predictions={response?.items || []}
        isLoading={isLoading}
        onSelectPrediction={(pred) => navigate(`/predictions/${pred.id}`)}
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
