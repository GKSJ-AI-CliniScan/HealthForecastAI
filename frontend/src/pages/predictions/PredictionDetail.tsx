import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePredictionDetail } from '@/features/predictions/prediction.hooks';
import { PredictionCard } from '@/components/predictions/PredictionCard';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';
import { ArrowLeft, User } from 'lucide-react';

export const PredictionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: prediction, isLoading, isError, refetch } = usePredictionDetail(id);

  if (isLoading) {
    return <LoadingSkeleton rows={8} />;
  }

  if (isError || !prediction) {
    return (
      <ErrorAlert
        message="Unable to load the requested risk prediction record or access is denied."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          icon={ArrowLeft}
        >
          Back
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/patients/${prediction.patient_id}`)}
          icon={User}
        >
          View Patient Clinical Record
        </Button>
      </div>

      <PageHeader
        title={`Prediction #${prediction.id.slice(0, 8)}`}
        subtitle="Individual patient readmission forecast details, factors, and decision-support guidance."
      />

      <PredictionCard prediction={prediction} />
    </div>
  );
};
