'use client';

import React from 'react';
import { RiskCategory } from '@/types';

export interface RiskGaugeProps {
  score: number; // 0.0 to 1.0 (e.g. 0.84 = 84%)
  riskCategory?: RiskCategory;
  size?: number; // Size in px (default 140)
  strokeWidth?: number; // Stroke in px (default 12)
  showLabel?: boolean;
  className?: string;
}

export function RiskGauge({
  score,
  riskCategory = 'medium',
  size = 140,
  strokeWidth = 12,
  showLabel = true,
  className = '',
}: RiskGaugeProps) {
  const percentage = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc length: 240 degrees (leaving a 120-degree gap at the bottom)
  const arcRatio = 0.75;
  const totalArc = circumference * arcRatio;
  const strokeDashoffset = totalArc - (totalArc * percentage) / 100;

  // Determine color based on risk category
  let strokeColor = '#D9A441'; // Amber (Medium)
  let glowColor = 'rgba(217, 164, 65, 0.2)';
  let textColor = 'text-amber-700 dark:text-amber-400';
  let categoryLabel = 'Medium Risk';

  if (percentage >= 65 || riskCategory === 'high') {
    strokeColor = '#C85C5C'; // Coral/Red (High)
    glowColor = 'rgba(200, 92, 92, 0.25)';
    textColor = 'text-coral-600 dark:text-coral-400';
    categoryLabel = 'High Risk';
  } else if (percentage < 35 || riskCategory === 'low') {
    strokeColor = '#7C9A82'; // Sage/Green (Low)
    glowColor = 'rgba(124, 154, 130, 0.25)';
    textColor = 'text-sage-700 dark:text-sage-400';
    categoryLabel = 'Low Risk';
  }

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label={`Readmission Risk Gauge: ${percentage}% (${categoryLabel})`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background Track Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={`${totalArc} ${circumference}`}
          strokeLinecap="round"
          className="text-warm-neutral/60 dark:text-warm-neutral/20"
        />

        {/* Dynamic Indicator Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${totalArc} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease',
            filter: `drop-shadow(0 0 6px ${glowColor})`,
          }}
        />
      </svg>

      {/* Center Percentage & Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${textColor}`}>
          {percentage}%
        </span>
        {showLabel && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-warm-text-muted dark:text-warm-text-muted -mt-0.5">
            {categoryLabel}
          </span>
        )}
      </div>
    </div>
  );
}
