'use client';
/**
 * ui.tsx — the small set of building blocks every page is made from.
 *
 * v2 ("Saral Pro"): Samarth found v1 too plain, so the LOOK was upgraded after comparing
 * the team's best UIs (white cards with soft shadow, icon chips, pill badges, clean tables) —
 * but the RULES stayed, because they are what makes it usable for everyone:
 *   - one idea per block; touch targets ≥ 44 px (WCAG 2.5.8 AA; most are 48)
 *   - risk is ALWAYS colour + icon + words ("⚠ High risk"), never colour alone
 *   - every page starts with one <h1> + one plain sentence of help + "Read aloud"
 *   - every list/number block also works as a proper table for screen readers
 * Same component names/props as v1, so every page got the new look without rewriting it.
 * FLOWS NEXT: imported by every page in src/app/**.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CircleDot, Inbox, RotateCw, Volume2 } from 'lucide-react';

import type { RiskLevel } from '@/data';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useA11y } from '@/a11y/A11yProvider';
import type { Query } from './useData';

/** Card surface used everywhere: white, thin border, soft shadow (solid border in high contrast). */
export const CARD = 'rounded-2xl border border-line bg-paper-raised shadow-card';

// ------------------------------------------------------------ page header
/** h1 (focusable so we can move focus to it on navigation) + help line + "read aloud". */
export function PageHeader({ title, help, children }: { title: string; help?: string; children?: ReactNode }) {
  const { t } = useI18n();
  const { readPage } = useA11y();
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 tabIndex={-1} className="text-2xl font-bold leading-tight tracking-tight text-ink outline-none sm:text-3xl">
          {title}
        </h1>
        {help && (
          <p data-page-help className="mt-1.5 max-w-prose text-base text-ink-soft">
            {help}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
        <Button variant="quiet" onClick={readPage} icon={<Volume2 size={18} />}>
          {t('a11y.read')}
        </Button>
      </div>
    </header>
  );
}

// ------------------------------------------------------------ section = titled card
export function Section({ title, children, id, action }: { title: string; children: ReactNode; id?: string; action?: ReactNode }) {
  return (
    <section aria-labelledby={id ? `${id}-h` : undefined} id={id} className={`${CARD} mb-6 p-5 sm:p-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={id ? `${id}-h` : undefined} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// ------------------------------------------------------------ buttons
type Variant = 'primary' | 'quiet' | 'danger';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-teal text-on-teal hover:bg-teal-dark border-teal shadow-sm',
  quiet: 'bg-paper-raised text-ink hover:bg-paper-sunk border-line',
  danger: 'bg-paper-raised text-rhigh hover:bg-rhigh-bg border-rhigh',
};
const BTN =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

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
  /** lucide icon element or a short symbol; always decorative */
  icon?: ReactNode;
  /** for toggle buttons (filters): tells screen readers on/off */
  pressed?: boolean;
}) {
  // A pressed filter looks "selected" (tinted + teal border), not just outlined.
  const pressedCls = pressed ? '!border-teal !bg-teal-bg !text-teal-dark ring-2 ring-teal' : '';
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-pressed={pressed} className={`${BTN} ${VARIANT[variant]} ${pressedCls}`}>
      {icon && (
        <span aria-hidden="true" className="inline-flex">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  icon,
  variant = 'quiet',
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: Variant;
}) {
  return (
    <Link href={href} className={`${BTN} ${VARIANT[variant]}`}>
      {icon && (
        <span aria-hidden="true" className="inline-flex">
          {icon}
        </span>
      )}
      {children}
    </Link>
  );
}

// ------------------------------------------------------------ numbers (KPI cards)
export function StatGrid({ children }: { children: ReactNode }) {
  // <dl> = "term : value" pairs → screen readers read "Patients, 1,824".
  return <dl className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</dl>;
}

export type Accent = 'teal' | 'blue' | 'violet' | RiskLevel;
const CHIP: Record<Accent, string> = {
  teal: 'bg-teal-bg text-teal',
  blue: 'bg-accent-blue-bg text-accent-blue',
  violet: 'bg-accent-violet-bg text-accent-violet',
  high: 'bg-rhigh-bg text-rhigh',
  medium: 'bg-rmid-bg text-rmid',
  low: 'bg-rlow-bg text-rlow',
};

/** Coloured icon square — only decoration; the label carries the meaning. */
export function IconChip({ icon, accent = 'teal', size = 'md' }: { icon: ReactNode; accent?: Accent; size?: 'md' | 'lg' }) {
  const s = size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl';
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center ${s} ${CHIP[accent]}`}>
      {icon}
    </span>
  );
}

export function Stat({ label, value, tone, icon, accent, note }: { label: string; value: string; tone?: RiskLevel; icon?: ReactNode; accent?: Accent; note?: string }) {
  // tone = "this number is a warning" → red top edge as well as the red icon chip.
  const edge = tone === 'high' ? 'border-t-4 border-t-rhigh' : tone === 'medium' ? 'border-t-4 border-t-rmid' : '';
  // HTML rule (caught by axe): a <div> inside <dl> may contain ONLY <dt>/<dd>.
  // So the decorative icon chip lives INSIDE the <dt>, next to the label.
  return (
    <div className={`${CARD} ${edge} p-5`}>
      <dt className="flex items-center gap-3 text-sm font-medium text-ink-soft">
        {icon && <IconChip icon={icon} accent={tone ?? accent ?? 'teal'} />}
        {label}
      </dt>
      <dd className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-ink">{value}</dd>
      {note && <dd className="mt-1 text-sm text-ink-soft">{note}</dd>}
    </div>
  );
}

// ------------------------------------------------------------ risk
const RISK_STYLE: Record<RiskLevel, { cls: string; Icon: typeof AlertTriangle; key: TKey }> = {
  high: { cls: 'bg-rhigh-bg text-rhigh border-rhigh', Icon: AlertTriangle, key: 'risk.high' },
  medium: { cls: 'bg-rmid-bg text-rmid border-rmid', Icon: CircleDot, key: 'risk.medium' },
  low: { cls: 'bg-rlow-bg text-rlow border-rlow', Icon: CheckCircle2, key: 'risk.low' },
};

export function RiskBadge({ level, pct }: { level: RiskLevel; pct?: number }) {
  const { t, formatNumber } = useI18n();
  const s = RISK_STYLE[level];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-sm font-semibold ${s.cls}`}>
      <s.Icon size={16} aria-hidden="true" />
      {t(s.key)}
      {pct !== undefined && <span className="tabular-nums">· {formatNumber(pct, 0)}%</span>}
    </span>
  );
}

/** Thin horizontal risk bar for tables: the % is also written next to it (not colour-only). */
export function RiskBar({ level, pct }: { level: RiskLevel; pct: number }) {
  const { formatNumber } = useI18n();
  const fill = level === 'high' ? 'bg-rhigh' : level === 'medium' ? 'bg-rmid' : 'bg-rlow';
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="h-2 w-20 overflow-hidden rounded-full bg-paper-sunk">
        <span className={`block h-full rounded-full ${fill}`} style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
      </span>
      <span className="tabular-nums text-sm font-semibold">{formatNumber(pct, 0)}%</span>
    </span>
  );
}

/** Round initials avatar (no photos exist in the data; initials make lists scannable). */
export function Avatar({ name, tone = 'teal' }: { name: string; tone?: Accent }) {
  // Real names → initials ("Asha Devi" → "AD"). The backend has no patient names yet, so
  // "Patient MRN-1001" would give "M1" for everyone → use the record's last 2 characters instead.
  const generic = /^Patient\s+(.+)$/i.exec(name);
  const initials = generic
    ? generic[1].replace(/[^A-Za-z0-9]/g, '').slice(-2).toUpperCase()
    : name
        .split(/[\s-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]!.toUpperCase())
        .join('');
  return (
    <span aria-hidden="true" className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${CHIP[tone]}`}>
      {initials || '•'}
    </span>
  );
}

// ------------------------------------------------------------ load states
/**
 * Renders loading / error / empty / content for a useData() query.
 * Error messages are plain language, chosen by error kind (http.ts).
 */
export function LoadState<T>({ q, children, isEmpty }: { q: Query<T>; children: (data: T) => ReactNode; isEmpty?: (data: T) => boolean }) {
  const { t } = useI18n();
  if (q.status === 'loading') {
    return (
      <div role="status" className="space-y-3">
        <span className="flex items-center gap-3 text-base text-ink-soft">
          <span aria-hidden="true" className="spinner" />
          {t('common.loading')}
        </span>
        {/* Skeleton bars: show the shape of what is coming (hidden from screen readers). */}
        <span aria-hidden="true" className="block h-4 w-2/3 animate-pulse rounded bg-paper-sunk" />
        <span aria-hidden="true" className="block h-4 w-1/2 animate-pulse rounded bg-paper-sunk" />
      </div>
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
      <div role="alert" className="flex flex-wrap items-center gap-4 rounded-2xl border border-rhigh bg-rhigh-bg p-5">
        <AlertTriangle aria-hidden="true" className="text-rhigh" />
        <p className="mr-auto text-base font-semibold text-rhigh">{t(key)}</p>
        {q.error.kind !== 'forbidden' && (
          <Button onClick={q.reload} variant="quiet" icon={<RotateCw size={18} />}>
            {t('common.retry')}
          </Button>
        )}
      </div>
    );
  }
  if (isEmpty?.(q.data)) return <Empty />;
  return <>{children(q.data)}</>;
}

export function Empty({ textKey = 'common.serverEmpty' }: { textKey?: TKey }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line p-8 text-center text-base text-ink-soft">
      <Inbox aria-hidden="true" size={32} />
      <p>{t(textKey)}</p>
    </div>
  );
}

// ------------------------------------------------------------ table
/**
 * Accessible table: <caption>, <th scope>, horizontal scroll on phones.
 * `rows` are already-formatted strings/nodes so the table stays dumb.
 */
export function SimpleTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm sm:text-base">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-paper-sunk">
            {headers.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line hover:bg-paper">
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-sm font-semibold text-rhigh">
          {error}
        </p>
      )}
    </div>
  );
}

export const INPUT =
  'block w-full min-h-[48px] rounded-xl border border-line bg-paper-raised px-4 text-base text-ink placeholder:text-ink-soft focus:border-teal focus:ring-2 focus:ring-teal-bg';
