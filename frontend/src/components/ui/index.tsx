import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Presentation primitives shared by every screen.
 *
 * Plain server components with no state. Colours come from the design tokens in
 * globals.css (canvas, surface, ink, rule, brand, zone-*), so a palette change
 * is made once, there.
 */

export interface Crumb {
  label: string;
  href?: string;
}

/** Page title, one line of context, and the page's own actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: Crumb[];
}) {
  return (
    <header className="space-y-3">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
            {breadcrumb.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && (
                  <span aria-hidden="true" className="text-rule-strong">
                    /
                  </span>
                )}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-brand hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-ink">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-title text-ink">{title}</h1>
          {description && <p className="mt-1.5 text-[0.9375rem] text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({
  title,
  children,
  actions,
  description,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <section className="rounded-[10px] border border-rule bg-surface p-5 sm:p-6">
      {(title || actions) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {title && <h2 className="text-section text-ink">{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * A labelled figure. The label paragraph is immediately followed by the value
 * paragraph (tests and assistive tech read them as a pair).
 */
export function StatTile({
  label,
  value,
  variant = 'tile',
}: {
  label: string;
  value: string | number;
  variant?: 'tile' | 'plain' | 'bare';
}) {
  const frame = {
    tile: 'rounded-[10px] border border-rule bg-surface px-5 py-4',
    plain: 'px-5 py-4',
    bare: '',
  }[variant];
  return (
    <div className={frame}>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-metric tabular-nums text-ink">{value}</p>
    </div>
  );
}

/** Several StatTiles in one panel, divided by rules rather than separate boxes. */
export function MetricStrip({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <section
      aria-label={label}
      className="grid grid-cols-2 divide-rule overflow-hidden rounded-[10px] border border-rule bg-surface sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] sm:divide-x [&>*]:border-rule max-sm:[&>*:nth-child(n+3)]:border-t max-sm:[&>*:nth-child(even)]:border-l"
    >
      {children}
    </section>
  );
}

export function Table({
  headers,
  children,
  empty,
  numeric = [],
  caption,
}: {
  headers: string[];
  children: ReactNode;
  empty?: string;
  /** Column indexes holding numbers: right-aligned, tabular figures. */
  numeric?: number[];
  caption?: string;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  if (!hasRows) {
    return (
      <p className="rounded-md border border-dashed border-rule-strong px-4 py-8 text-center text-sm text-ink-muted">
        {empty ?? 'Nothing to show yet.'}
      </p>
    );
  }
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-rule-strong text-left">
            {headers.map((header, index) => (
              <th
                key={`${header}-${index}`}
                scope="col"
                className={`whitespace-nowrap px-3 pb-2.5 pt-1 text-[0.8125rem] font-semibold text-ink-muted ${
                  numeric.includes(index) ? 'text-right' : ''
                }`}
              >
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
  return (
    <tr className="border-b border-rule transition-colors last:border-0 hover:bg-sunken">
      {children}
    </tr>
  );
}

export function Cell({ children, numeric = false }: { children: ReactNode; numeric?: boolean }) {
  return (
    <td className={`px-3 py-2.5 align-middle ${numeric ? 'text-right tabular-nums' : ''}`}>
      {children}
    </td>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-rule bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted">
      {children}
    </span>
  );
}

const ZONE_STYLE: Record<string, string> = {
  low: 'border-zone-low/30 bg-zone-low-tint text-zone-low',
  medium: 'border-zone-medium/30 bg-zone-medium-tint text-zone-medium',
  high: 'border-zone-high/30 bg-zone-high-tint text-zone-high',
};

const ZONE_DOT: Record<string, string> = {
  low: 'bg-zone-low-fill',
  medium: 'bg-zone-medium-fill',
  high: 'bg-zone-high-fill',
};

/**
 * LOW / MEDIUM / HIGH band label as returned by the API. The text always
 * names the band, so the colour is never the only signal.
 */
export function RiskBadge({ category }: { category: string }) {
  const key = category.toLowerCase();
  const style = ZONE_STYLE[key] ?? 'border-rule bg-sunken text-ink-muted';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold tracking-[0.02em] ${style}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${ZONE_DOT[key] ?? 'bg-ink-muted'}`} />
      {category.toUpperCase()}
    </span>
  );
}

/** Label / value pairs (demographics, metadata). */
export function DefinitionList({
  items,
  columns = 2,
}: {
  items: { term: string; value: ReactNode }[];
  columns?: 2 | 3;
}) {
  return (
    <dl
      className={`grid gap-x-8 gap-y-4 text-[0.9375rem] sm:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''}`}
    >
      {items.map((item) => (
        <div key={item.term} className="min-w-0">
          <dt className="text-sm text-ink-muted">{item.term}</dt>
          <dd className="mt-0.5 font-semibold text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/40 bg-danger-tint px-3 py-2 text-sm text-ink"
    >
      {children}
    </p>
  );
}
