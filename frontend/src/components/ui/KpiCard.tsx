interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warn' | 'good';
}

const TONES: Record<string, string> = {
  default: 'var(--foreground)',
  warn: '#d93025',
  good: '#0f9d58',
};

export function KpiCard({ label, value, hint, tone = 'default' }: KpiCardProps) {
  return (
    <div className="card">
      <p className="muted text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-3xl font-semibold" style={{ color: TONES[tone] }}>
        {value}
      </p>
      {hint ? <p className="muted mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}
