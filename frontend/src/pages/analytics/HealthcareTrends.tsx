import React, { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';
import { ClinicalDisclaimer } from '@/components/common/ClinicalDisclaimer';
import { HealthcareTrendChart } from '@/components/analytics/HealthcareTrendChart';
import { useHealthcareTrends } from '@/features/analytics/analytics.hooks';

export const HealthcareTrends: React.FC = () => {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const { data, isLoading, isError, refetch } = useHealthcareTrends({ frequency });

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (isError || !data) {
    return (
      <ErrorAlert
        message="Unable to load temporal healthcare trends."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Healthcare Trend Monitoring"
        subtitle="Temporal tracking of patient admissions, clinical discharges, therapy volumes, and readmission events across daily, weekly, and monthly horizons."
      />

      <ClinicalDisclaimer />

      <HealthcareTrendChart
        trends={data.trends}
        frequency={frequency}
        onFrequencyChange={setFrequency}
      />
    </div>
  );
};
