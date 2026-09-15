import type { ReactNode } from 'react';

/**
 * Minimal presentation primitives shared by the Milestone 1 screens.
 *
 * Deliberately small: the milestone asks for a working dashboard shell, not a
 * design system. Everything here is a plain server component.
 */

export function Card({
  title,
  children,
  actions,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      {(title || actions) && (
        <header className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  caption,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  caption?: string;
  tone?: 'default' | 'alert';
}) {
  // A clinical figure that needs attention is marked by weight and a rule, not
  // colour alone, so it still reads when colour is unavailable.
  const emphasis =
    tone === 'alert'
      ? 'border-l-2 border-l-risk-high text-risk-high'
      : 'border-l-2 border-l-transparent';
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className={`mt-1 pl-2 text-2xl font-semibold tabular-nums ${emphasis}`}>{value}</p>
      {caption && <p className="mt-1 text-xs opacity-60">{caption}</p>}
    </div>
  );
}

/** A labelled proportion bar, for the risk band distribution. */
export function DistributionBar({
  segments,
}: {
  segments: { label: string; value: number; className: string }[];
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total === 0) {
    return <p className="py-2 text-sm opacity-70">No scored patients to distribute yet.</p>;
  }
  return (
    <div className="space-y-3">
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--border)]"
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}
      >
        {segments.map((segment) =>
          segment.value > 0 ? (
            <div
              key={segment.label}
              className={segment.className}
              style={{ width: `${(segment.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-baseline gap-2">
            <dt className="opacity-70">{segment.label}</dt>
            <dd className="font-semibold tabular-nums">{segment.value}</dd>
            <dd className="text-xs opacity-60">
              {total > 0 ? `${Math.round((segment.value / total) * 100)}%` : '0%'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Neutral empty state, distinct from ErrorNote so "none" never reads as "broken". */
export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-sm opacity-70">
      {children}
    </p>
  );
}

export function Table({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: string;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  if (!hasRows) {
    return <p className="py-6 text-sm opacity-70">{empty ?? 'Nothing to show yet.'}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium opacity-70">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="border-b border-[var(--border)] last:border-0">{children}</tr>;
}

export function Cell({ children }: { children: ReactNode }) {
  return <td className="px-3 py-2 align-top">{children}</td>;
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">
      {children}
    </span>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm">
      {children}
    </p>
  );
}

/** Risk band badge. Tone is semantic, and the band name is always spelled out. */
export function RiskBadge({ band }: { band: 'low' | 'medium' | 'high' }) {
  const tone = {
    low: 'border-risk-low/40 text-risk-low',
    medium: 'border-risk-medium/50 text-risk-medium',
    high: 'border-risk-high/50 text-risk-high font-semibold',
  }[band];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${tone}`}>{band}</span>
  );
}

/* -------------------------------------------------------------------------
 * Skeletons
 *
 * These mirror the real layouts rather than showing a spinner, so the page
 * does not jump when data arrives. Each is aria-hidden and sits inside a
 * container that announces the load to assistive technology once, instead of
 * every shimmering block announcing itself.
 * ---------------------------------------------------------------------- */

/** Wraps a skeleton screen and announces it politely, once. */
export function SkeletonScreen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-6">
        {children}
      </div>
    </div>
  );
}

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-[var(--border)] motion-reduce:animate-none ${className}`} />
  );
}

/** Placeholder matching StatTile's box, so the grid does not reflow. */
export function SkeletonTile() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <Shimmer className="h-3 w-24" />
      <Shimmer className="mt-3 h-7 w-16" />
      <Shimmer className="mt-2 h-3 w-32" />
    </div>
  );
}

/** Placeholder matching Card, with an optional title bar. */
export function SkeletonCard({
  title = true,
  lines = 3,
}: {
  title?: boolean;
  lines?: number;
}) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      {title && <Shimmer className="mb-4 h-4 w-40" />}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Shimmer key={index} className={`h-3 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </section>
  );
}

/** Placeholder matching Table inside a Card. */
export function SkeletonTable({ rows = 4, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <Shimmer className="mb-4 h-4 w-40" />
      <div className="space-y-3">
        <div className="flex gap-4 border-b border-[var(--border)] pb-2">
          {Array.from({ length: columns }).map((_, index) => (
            <Shimmer key={index} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Shimmer key={columnIndex} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
