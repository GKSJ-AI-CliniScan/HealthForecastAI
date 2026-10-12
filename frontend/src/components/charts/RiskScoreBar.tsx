import type { RiskCategory } from '@/types';

import { BAND_CUTOFFS, BANDS } from './bands';

const ZONE_TRACK: Record<string, string> = {
  low: 'bg-zone-low-tint',
  medium: 'bg-zone-medium-tint',
  high: 'bg-zone-high-tint',
};

const ZONE_MARK: Record<string, string> = {
  low: 'bg-zone-low',
  medium: 'bg-zone-medium',
  high: 'bg-zone-high',
};

const pct = (value: number) => `${Math.min(Math.max(value, 0), 1) * 100}%`;

/**
 * The band scale: a 0-1 ruler split into the LOW / MEDIUM / HIGH zones at the
 * fixed 0.40 and 0.70 cut-offs, with a marker at the model score.
 *
 * The marker sits at the unrounded score; its colour follows the band the API
 * returned (``category``). Decorative for assistive tech - the score and band
 * are given as text right next to it, and the cut-offs in the caption.
 */
export default function RiskScoreBar({
  probability,
  category,
  size = 'lg',
}: {
  probability: number;
  category: RiskCategory;
  size?: 'lg' | 'sm';
}) {
  const large = size === 'lg';
  return (
    <div aria-hidden="true" className={large ? 'w-full pb-5 pt-1' : 'w-28'} data-testid="band-scale">
      <div className={`relative ${large ? 'h-3' : 'h-2'}`}>
        <div className="flex h-full w-full overflow-hidden rounded-full ring-1 ring-inset ring-ink/10">
          {BANDS.map((band) => (
            <div
              key={band.key}
              data-band={band.key}
              className={`h-full ${ZONE_TRACK[band.key]} ${band.key !== 'low' ? 'border-l border-ink/25' : ''}`}
              style={{ width: `${Number(((band.to - band.from) * 100).toFixed(4))}%` }}
            />
          ))}
        </div>
        <div
          data-testid="band-marker"
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${
            ZONE_MARK[category] ?? 'bg-ink'
          } ${large ? 'h-5 w-[5px]' : 'h-3.5 w-1'}`}
          style={{ left: pct(probability) }}
        />
        {large && (
          <div className="absolute inset-x-0 top-full mt-1.5 text-xs tabular-nums leading-none text-ink-muted">
            <span className="absolute left-0">0.00</span>
            <span className="absolute -translate-x-1/2" style={{ left: pct(BAND_CUTOFFS.medium) }}>
              {BAND_CUTOFFS.medium.toFixed(2)}
            </span>
            <span className="absolute -translate-x-1/2" style={{ left: pct(BAND_CUTOFFS.high) }}>
              {BAND_CUTOFFS.high.toFixed(2)}
            </span>
            <span className="absolute right-0">1.00</span>
          </div>
        )}
      </div>
    </div>
  );
}
