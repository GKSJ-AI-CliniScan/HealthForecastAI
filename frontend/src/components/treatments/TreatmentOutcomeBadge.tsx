import React from 'react';
import { getOutcomeBadgeClass } from '@/features/analytics/analytics.utils';

interface TreatmentOutcomeBadgeProps {
  outcome?: string | null;
  className?: string;
}

export const TreatmentOutcomeBadge: React.FC<TreatmentOutcomeBadgeProps> = ({
  outcome,
  className = '',
}) => {
  const display = (outcome || 'PENDING').replace('_', ' ');
  const badgeStyle = getOutcomeBadgeClass(outcome);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle} ${className}`}
    >
      {display}
    </span>
  );
};
