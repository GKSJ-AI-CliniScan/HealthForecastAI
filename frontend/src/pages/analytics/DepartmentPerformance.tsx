import React from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';
import { ClinicalDisclaimer } from '@/components/common/ClinicalDisclaimer';
import { DepartmentPerformanceTable } from '@/components/analytics/DepartmentPerformanceTable';
import { useDepartmentAnalytics } from '@/features/analytics/analytics.hooks';

export const DepartmentPerformance: React.FC = () => {
  const { data, isLoading, isError, refetch } = useDepartmentAnalytics();

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (isError || !data) {
    return (
      <ErrorAlert
        message="Unable to load clinical department analytics."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Analytics & Workload Distribution"
        subtitle="Detailed comparative metrics across clinical units including inpatient stay duration, therapy volumes, and treatment efficacy."
      />

      <ClinicalDisclaimer />

      <DepartmentPerformanceTable departments={data.departments} />
    </div>
  );
};
