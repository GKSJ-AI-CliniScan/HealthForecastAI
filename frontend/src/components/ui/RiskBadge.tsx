import type { RiskCategory } from '@/types';

const STYLES: Record<RiskCategory, { bg: string; fg: string; label: string }> = {
  high: { bg: '#fdecea', fg: '#8a1c12', label: 'High' },
  medium: { bg: '#fff4e5', fg: '#8a5300', label: 'Medium' },
  low: { bg: '#e6f4ea', fg: '#0f7b39', label: 'Low' },
};

export function RiskBadge({ category }: { category: RiskCategory | string }) {
  const style = STYLES[category as RiskCategory] ?? {
    bg: 'var(--surface-muted)',
    fg: 'var(--muted)',
    label: category || '—',
  };

  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: style.bg, color: style.fg }}
    >
      {style.label}
    </span>
  );
}

/** A probability rendered as a percentage with a proportional bar. */
export function RiskMeter({ probability }: { probability: number }) {
  const percent = Math.min(100, Math.max(0, probability * 100));
  const colour = probability >= 0.2 ? '#d93025' : probability >= 0.12 ? '#f4b400' : '#0f9d58';

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 w-20 overflow-hidden rounded-full"
        style={{ background: 'var(--surface-muted)' }}
      >
        <div style={{ width: `${percent}%`, height: '100%', background: colour }} />
      </div>
      <span className="tabular-nums text-sm">{percent.toFixed(1)}%</span>
    </div>
  );
}
