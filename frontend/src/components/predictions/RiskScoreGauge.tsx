import React from 'react';
import { RiskCategory } from '@/features/predictions/prediction.types';
import { RISK_STYLES } from '@/features/predictions/prediction.utils';
import { RiskBadge } from './RiskBadge';

interface RiskScoreGaugeProps {
  score: number;
  category: RiskCategory;
  probability: number;
  size?: number;
}

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({
  score,
  category,
  probability,
  size = 220,
}) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Arc calculations (240 degree gauge arc from 150deg to 390deg)
  const arcLength = circumference * (240 / 360);
  const strokeDashoffset = arcLength - (arcLength * Math.min(100, Math.max(0, score))) / 100;

  const currentStyle = RISK_STYLES[category] || RISK_STYLES.LOW;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-[210deg]"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            className="text-slate-100 dark:text-slate-800"
          />

          {/* Active value track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={currentStyle.colorHex}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out drop-shadow-sm"
          />
        </svg>

        {/* Center values */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Readmission Risk
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              {score}
            </span>
            <span className="text-xs font-bold text-slate-400">/100</span>
          </div>
          <div className="mt-1">
            <RiskBadge category={category} size="sm" />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Prob: {Math.round(probability * 100)}%
          </span>
        </div>
      </div>

      {/* Threshold indicator legend */}
      <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> 0–25 Low
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> 26–50 Med
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" /> 51–75 High
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-600" /> 76–100 Crit
        </span>
      </div>
    </div>
  );
};
