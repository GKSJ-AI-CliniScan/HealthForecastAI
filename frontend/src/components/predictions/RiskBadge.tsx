import React from 'react';
import { RiskCategory } from '@/features/predictions/prediction.types';
import { RISK_STYLES } from '@/features/predictions/prediction.utils';
import { Shield, AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';

interface RiskBadgeProps {
  category: RiskCategory;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  category,
  showIcon = true,
  size = 'md',
}) => {
  const style = RISK_STYLES[category] || RISK_STYLES.LOW;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  };

  const getIcon = () => {
    switch (category) {
      case 'LOW':
        return <CheckCircle className="w-3.5 h-3.5" />;
      case 'MEDIUM':
        return <Shield className="w-3.5 h-3.5" />;
      case 'HIGH':
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'CRITICAL':
        return <AlertOctagon className="w-3.5 h-3.5" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border transition-all ${style.bg} ${style.text} ${style.border} ${sizeClasses[size]}`}
    >
      {showIcon && getIcon()}
      <span>{style.label}</span>
    </span>
  );
};
