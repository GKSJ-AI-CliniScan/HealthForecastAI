'use client';
/**
 * RiskGauge.tsx — half-circle gauge for one patient's chance of coming back (0–100%).
 *
 * Pure SVG (no chart library): an arc track + a coloured arc up to the value + the big
 * number in the middle + the risk badge (icon + word) under it. The SVG is aria-hidden;
 * the sentence above it and the badge carry the meaning for screen readers.
 * FLOWS NEXT: Risk check page and the patient page.
 */
import { useA11y } from '@/a11y/A11yProvider';
import type { RiskLevel } from '@/data';
import { useI18n } from '@/i18n/I18nProvider';
import { chartColors } from './chartTheme';
import { RiskBadge } from './ui';

export function RiskGauge({ pct, level }: { pct: number; level: RiskLevel }) {
  const { formatNumber } = useI18n();
  const { settings } = useA11y();
  const c = chartColors(settings);
  const v = Math.max(0, Math.min(100, pct));
  // Semicircle from 180° to 0°, radius 80, centre (100,100). pathLength=100 makes dash maths = percent.
  const arc = 'M 20 100 A 80 80 0 0 1 180 100';
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 112" className="w-full max-w-[260px]" aria-hidden="true">
        <path d={arc} fill="none" stroke={c.track} strokeWidth="18" strokeLinecap="round" />
        <path
          d={arc}
          fill="none"
          stroke={c.risk[level]}
          strokeWidth="18"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${v} 100`}
        />
        <text
          x="100"
          y="92"
          textAnchor="middle"
          fontSize="34"
          fontWeight="700"
          fill={c.tick === '#ffffff' ? '#ffffff' : settings.dark ? '#e8eef6' : '#0f1b2a'}
        >
          {formatNumber(v, 0)}%
        </text>
      </svg>
      <div className="-mt-1">
        <RiskBadge level={level} />
      </div>
    </div>
  );
}
