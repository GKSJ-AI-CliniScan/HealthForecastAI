'use client';
/**
 * ui.tsx — the small set of building blocks every page is made from.
 *
 * DESIGN RULES (why the UI looks like this):
 *   - one idea per block, big text, big touch targets (min 48 px — WCAG 2.5.5)
 *   - risk is ALWAYS colour + icon + words ("⚠ High risk"), never colour alone
 *     (colour-blind and blind users get the same information)
 *   - every page starts with one <h1> + one plain sentence of help
 *   - every list/number block also works as a proper table for screen readers
 * FLOWS NEXT: imported by every page in src/app/**.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { RiskLevel } from '@/data';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useA11y } from '@/a11y/A11yProvider';
import type { Query } from './useData';

// ------------------------------------------------------------ page header
/** h1 (focusable so we can move focus to it on navigation) + help line + "read aloud". */
export function PageHeader({ title, help, children }: { title: string; help?: string; children?: ReactNode }) {
  const { t } = useI18n();
  const { readPage } = useA11y();
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 tabIndex={-1} className="text-3xl font-bold leading-tight text-ink outline-none">
          {title}
        </h1>
        {help && (
          <p data-page-help className="mt-2 max-w-prose text-lg text-ink-soft">
            {help}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
        <Button variant="quiet" onClick={readPage} icon="🔊">
          {t('a11y.read')}
        </Button>
      </div>
    </header>
  );
}

// ------------------------------------------------------------ section
export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id ? `${id}-h` : undefined} id={id} className="mb-8">
      <h2 id={id ? `${id}-h` : undefined} className="mb-3 text-2xl font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ------------------------------------------------------------ buttons
type Variant = 'primary' | 'quiet' | 'danger';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-teal text-white hover:bg-teal-dark border-teal',
  quiet: 'bg-paper-raised text-ink hover:bg-paper-sunk border-line',
  danger: 'bg-paper-raised text-rhigh hover:bg-rhigh-bg border-rhigh',
};
const BTN = 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-2 text-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  icon,
  pressed,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  type?: 'button' | 'submit';
  disabled?: boolean;
  icon?: string;
  /** for toggle buttons (filters): tells screen readers on/off */
  pressed?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-pressed={pressed} className={`${BTN} ${VARIANT[variant]} ${pressed ? 'ring-4 ring-marigold' : ''}`}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}

export function LinkButton({ href, children, icon, variant = 'quiet' }: { href: string; children: ReactNode; icon?: string; variant?: Variant }) {
  return (
    <Link href={href} className={`${BTN} ${VARIANT[variant]}`}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </Link>
  );
}

// ------------------------------------------------------------ numbers
export function StatGrid({ children }: { children: ReactNode }) {
  // <dl> = "term : value" pairs → screen readers read "Patients, 1,824".
  return <dl className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>;
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: RiskLevel }) {
  const toneCls = tone === 'high' ? 'border-rhigh' : tone === 'medium' ? 'border-rmid' : 'border-line';
  return (
    <div className={`rounded-2xl border-2 ${toneCls} bg-paper-raised p-5`}>
      <dt className="text-lg text-ink-soft">{label}</dt>
      <dd className="mt-1 text-4xl font-bold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

// ------------------------------------------------------------ risk
const RISK_STYLE: Record<RiskLevel, { cls: string; icon: string; key: TKey }> = {
  high: { cls: 'bg-rhigh-bg text-rhigh border-rhigh', icon: '⚠', key: 'risk.high' },
  medium: { cls: 'bg-rmid-bg text-rmid border-rmid', icon: '●', key: 'risk.medium' },
  low: { cls: 'bg-rlow-bg text-rlow border-rlow', icon: '✓', key: 'risk.low' },
};

export function RiskBadge({ level, pct }: { level: RiskLevel; pct?: number }) {
  const { t, formatNumber } = useI18n();
  const s = RISK_STYLE[level];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-base font-semibold ${s.cls}`}>
      <span aria-hidden="true">{s.icon}</span>
      {t(s.key)}
      {pct !== undefined && <span className="tabular-nums">· {formatNumber(pct, 0)}%</span>}
    </span>
  );
}

// ------------------------------------------------------------ load states
/**
 * Renders loading / error / empty / content for a useData() query.
 * Error messages are plain language, chosen by error kind (http.ts).
 */
export function LoadState<T>({
  q,
  children,
  isEmpty,
}: {
  q: Query<T>;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
}) {
  const { t } = useI18n();
  if (q.status === 'loading') {
    return (
      <p role="status" className="flex items-center gap-3 text-xl text-ink-soft">
        <span aria-hidden="true" className="spinner" />
        {t('common.loading')}
      </p>
    );
  }
  if (q.status === 'error') {
    const key: TKey =
      q.error.kind === 'offline'
        ? 'common.offline'
        : q.error.kind === 'forbidden'
          ? 'common.noAccess'
          : q.error.kind === 'not_found'
            ? 'patient.notFound'
            : 'common.error';
    return (
      <div role="alert" className="rounded-2xl border-2 border-rhigh bg-rhigh-bg p-5">
        <p className="text-xl font-semibold text-rhigh">{t(key)}</p>
        {q.error.kind !== 'forbidden' && (
          <div className="mt-3">
            <Button onClick={q.reload} icon="↻">
              {t('common.retry')}
            </Button>
          </div>
        )}
      </div>
    );
  }
  if (isEmpty?.(q.data)) return <Empty />;
  return <>{children(q.data)}</>;
}

export function Empty({ textKey = 'common.serverEmpty' }: { textKey?: TKey }) {
  const { t } = useI18n();
  return <p className="rounded-2xl border-2 border-dashed border-line p-6 text-xl text-ink-soft">{t(textKey)}</p>;
}

// ------------------------------------------------------------ table
/**
 * Accessible table: <caption>, <th scope>, horizontal scroll on phones.
 * `rows` are already-formatted strings/nodes so the table stays dumb.
 */
export function SimpleTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-line bg-paper-raised">
      <table className="w-full min-w-[32rem] border-collapse text-left text-lg">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b-2 border-line bg-paper-sunk">
            {headers.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold text-ink">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              {r.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-4 py-3 font-semibold text-ink">
                    {cell}
                  </th>
                ) : (
                  <td key={j} className="px-4 py-3 tabular-nums text-ink">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------ form field
export function Field({
  id,
  label,
  error,
  children,
  hint,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-2 block text-lg font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-base text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-base font-semibold text-rhigh">
          {error}
        </p>
      )}
    </div>
  );
}

export const INPUT =
  'block w-full min-h-[52px] rounded-xl border-2 border-line bg-paper-raised px-4 text-lg text-ink placeholder:text-ink-soft focus:border-teal';
