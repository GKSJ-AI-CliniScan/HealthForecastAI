/**
 * chartTheme.ts — real colour values for charts, per theme.
 * WHY: SVG fill/stroke ATTRIBUTES cannot read CSS variables (found in the browser test:
 * bars were invisible), so charts get concrete colours that MATCH globals.css for
 * light, dark and high-contrast. Keep these in sync with the CSS variables.
 * FLOWS NEXT: BarChartA11y, DonutChartA11y, RiskGauge.
 */
import type { RiskLevel } from '../data/types';

export interface ChartColors {
  bar: string;
  grid: string;
  tick: string;
  track: string;
  risk: Record<RiskLevel, string>;
}

export function chartColors(s: { contrast: boolean; dark: boolean }): ChartColors {
  if (s.contrast)
    return {
      bar: '#ffeb3b',
      grid: '#ffffff',
      tick: '#ffffff',
      track: '#333333',
      risk: { high: '#ff8a80', medium: '#ffd54f', low: '#69f0ae' },
    };
  if (s.dark)
    return {
      bar: '#2cc5b6',
      grid: '#2a3850',
      tick: '#a9b6c6',
      track: '#18233a',
      risk: { high: '#f87171', medium: '#fbbf24', low: '#4ade80' },
    };
  return {
    bar: '#0b6e79',
    grid: '#e3e8ee',
    tick: '#4b5b6e',
    track: '#eef2f6',
    risk: { high: '#c0392b', medium: '#d49100', low: '#2e8b57' },
  };
}
