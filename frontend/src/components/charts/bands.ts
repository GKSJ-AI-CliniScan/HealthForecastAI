/**
 * The fixed cut-offs the backend uses to band a model score
 * (backend/app/core/config.py RISK_THRESHOLD_MEDIUM / RISK_THRESHOLD_HIGH,
 * applied in risk_service.categorise_risk). Display only: the band shown for a
 * score always comes from the API's risk_category, never from these numbers.
 * If the backend thresholds change, change them here and in SCORE_NOTES.bands.
 */
export const BAND_CUTOFFS = { medium: 0.4, high: 0.7 } as const;

export type BandKey = 'low' | 'medium' | 'high';

/** The three bands across the 0-1 score range, in order. */
export const BANDS: { key: BandKey; from: number; to: number }[] = [
  { key: 'low', from: 0, to: BAND_CUTOFFS.medium },
  { key: 'medium', from: BAND_CUTOFFS.medium, to: BAND_CUTOFFS.high },
  { key: 'high', from: BAND_CUTOFFS.high, to: 1 },
];

/** Chart fills for the zone backgrounds (low opacity is applied where used). */
export const BAND_FILL: Record<BandKey, string> = {
  low: '#5A9E78',
  medium: '#D09A35',
  high: '#C0524C',
};
