import { RiskCategory } from './prediction.types';

export const HEALTHCARE_DISCLAIMER_TEXT =
  'AI-generated predictions are decision-support information and must be reviewed by qualified healthcare professionals.';

export interface RiskStyle {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  colorHex: string;
}

export const RISK_STYLES: Record<RiskCategory, RiskStyle> = {
  LOW: {
    label: 'Low Risk',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    colorHex: '#10b981',
  },
  MEDIUM: {
    label: 'Moderate Risk',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
    colorHex: '#f59e0b',
  },
  HIGH: {
    label: 'High Risk',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    dot: 'bg-orange-500',
    colorHex: '#f97316',
  },
  CRITICAL: {
    label: 'Critical Risk',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-600 animate-pulse',
    colorHex: '#e11d48',
  },
};

export const formatProbability = (prob: number): string => {
  return `${Math.round(prob * 100)}%`;
};

export const getRiskBandDescription = (category: RiskCategory): string => {
  switch (category) {
    case 'LOW':
      return 'Score 0–25: Lower readmission likelihood based on current clinical features.';
    case 'MEDIUM':
      return 'Score 26–50: Moderate predicted readmission risk; routine follow-up suggested.';
    case 'HIGH':
      return 'Score 51–75: Elevated readmission risk; multidisciplinary review advised.';
    case 'CRITICAL':
      return 'Score 76–100: Severe readmission probability; prioritize intensive transitional care.';
  }
};
