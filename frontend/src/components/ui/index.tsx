// FILE: src/components/ui/index.tsx

'use client';

import { AlertCircle, CheckCircle2, Loader2, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[.16em] text-clinical-600">
          {eyebrow}
        </div>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-950 sm:text-[28px]">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}

export function KpiCard({
  label,
  value,
  detail,
  icon,
  accent = 'navy',
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  accent?: 'navy' | 'teal' | 'green' | 'amber' | 'red';
}) {
  const bars = {
    navy: 'bg-navy-900',
    teal: 'bg-clinical-500',
    green: 'bg-risk-low',
    amber: 'bg-risk-medium',
    red: 'bg-risk-high',
  };

  return (
    <div className="surface relative overflow-hidden p-5">
      <div className={`absolute inset-y-0 left-0 w-1 ${bars[accent]}`} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-navy-950">
            {value}
          </p>

          {detail && (
            <p className="mt-1 text-xs text-slate-500">
              {detail}
            </p>
          )}
        </div>

        {icon && (
          <div className="rounded-xl bg-slate-50 p-2.5 text-slate-500">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function RiskPill({ category }: { category: string }) {
  const c = category.toLowerCase();

  const styles =
    c === 'high'
      ? 'border-red-200 bg-red-50 text-risk-high'
      : c === 'medium'
        ? 'border-amber-200 bg-amber-50 text-risk-medium'
        : c === 'low'
          ? 'border-emerald-200 bg-emerald-50 text-risk-low'
          : 'border-slate-200 bg-slate-50 text-slate-500';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {c.replace('_', ' ')}
    </span>
  );
}

export function RiskScore({
  probability,
  category,
  showCategory = true,
}: {
  probability: number;
  category?: string;
  showCategory?: boolean;
}) {
  const percentage = Math.max(0, Math.min(100, probability * 100));

  const categoryName = (category ?? '').toLowerCase();

  const bar =
    categoryName === 'high'
      ? 'bg-risk-high'
      : categoryName === 'medium'
        ? 'bg-risk-medium'
        : 'bg-risk-low';

  return (
    <div className="min-w-[145px]">
      <div className="flex items-center gap-2">
        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200 sm:w-24">
          <div
            className={`h-full rounded-full ${bar}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <span className="font-mono text-xs font-semibold text-navy-950">
          {percentage.toFixed(1)}%
        </span>

        {showCategory && category && (
          <RiskPill category={category} />
        )}
      </div>
    </div>
  );
}

export function RiskLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
      <span className="font-semibold text-slate-700">Risk bands</span>

      <span>
        <RiskPill category="low" /> &lt; 12%
      </span>

      <span>
        <RiskPill category="medium" /> 12–20.9%
      </span>

      <span>
        <RiskPill category="high" /> ≥ 21%
      </span>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface ${className}`}>
      <div className="p-5 sm:p-6">
        {(title || description || actions) && (
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              {title && (
                <h2 className="text-sm font-bold text-navy-950">
                  {title}
                </h2>
              )}

              {description && (
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {description}
                </p>
              )}
            </div>

            {actions}
          </div>
        )}

        {children}
      </div>
    </section>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-4 rounded bg-slate-100"
          style={{ width: `${85 - index * 12}%` }}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({
  columns = 5,
  rows = 5,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="animate-pulse divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="grid gap-4 px-5 py-4"
          style={{
            gridTemplateColumns: `repeat(${columns},minmax(0,1fr))`,
          }}
        >
          {Array.from({ length: columns }).map((_, column) => (
            <div
              key={column}
              className="h-4 rounded bg-slate-100"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  icon = <SearchX className="h-5 w-5" />,
}: {
  title: string;
  message: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
        {icon}
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-700">
        {title}
      </p>

      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
        {message}
      </p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

      <div className="flex-1">
        <p className="font-semibold">Something went wrong</p>

        <p className="mt-0.5 text-xs leading-5 text-red-700">
          {message}
        </p>
      </div>

      {onRetry && (
        <button
          className="text-xs font-semibold underline"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function SuccessNotice({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
    >
      <CheckCircle2 className="h-4 w-4" />
      {message}
    </div>
  );
}

export function PermissionGate({
  allowed,
  children,
  fallback,
}: {
  allowed: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return allowed ? <>{children}</> : fallback ?? null;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold text-slate-700"
      >
        {label}
      </label>

      {children}

      {hint && !error && (
        <p className="mt-1 text-[11px] text-slate-400">
          {hint}
        </p>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <button
      className="btn-primary focus-ring disabled:opacity-50"
      disabled={loading}
    >
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}

      {loading ? 'Saving…' : children}
    </button>
  );
}

export function formatRole(role: string | null) {
  return role
    ? role
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase())
    : '—';
}

export function formatDate(value?: string | null) {
  if (!value) return '—';

  const d = new Date(value);

  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

export function riskPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: string;
}) {
  const normalizedTone = tone.toLowerCase();

  const toneStyles: Record<
    string,
    {
      background: string;
      color: string;
      border: string;
      dot: string;
    }
  > = {
    success: {
      background: "#ecfdf5",
      color: "#047857",
      border: "#a7f3d0",
      dot: "#10b981",
    },

    warning: {
      background: "#fffbeb",
      color: "#b45309",
      border: "#fde68a",
      dot: "#f59e0b",
    },

    danger: {
      background: "#fef2f2",
      color: "#dc2626",
      border: "#fecaca",
      dot: "#ef4444",
    },

    error: {
      background: "#fef2f2",
      color: "#dc2626",
      border: "#fecaca",
      dot: "#ef4444",
    },

    info: {
      background: "#eff6ff",
      color: "#2563eb",
      border: "#bfdbfe",
      dot: "#3b82f6",
    },

    neutral: {
      background: "#f8fafc",
      color: "#475569",
      border: "#e2e8f0",
      dot: "#64748b",
    },

    low: {
      background: "#ecfdf5",
      color: "#047857",
      border: "#a7f3d0",
      dot: "#10b981",
    },

    medium: {
      background: "#fffbeb",
      color: "#b45309",
      border: "#fde68a",
      dot: "#f59e0b",
    },

    high: {
      background: "#fef2f2",
      color: "#dc2626",
      border: "#fecaca",
      dot: "#ef4444",
    },
  };

  const style = toneStyles[normalizedTone] ?? toneStyles.neutral;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      style={{
        backgroundColor: style.background,
        color: style.color,
        borderColor: style.border,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          backgroundColor: style.dot,
        }}
      />

      {label}
    </span>
  );
}