'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { describeFailure } from '@/lib/errors';
import { FILTER_LABELS, REPORT_FORMATS, type ReportTypeOption } from '@/lib/reports';
import type {
  ReportFilterKey,
  ReportFilters,
  ReportFormat,
  ReportGenerateRequest,
  ReportType,
} from '@/types';

const inputClass =
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm';

const MONTH_OPTIONS = [6, 12, 24, 36];

/** Only the filters the chosen type understands, and only the ones filled in. */
export function buildFilters(
  keys: ReportFilterKey[],
  values: Partial<Record<ReportFilterKey, string>>,
): ReportFilters {
  const filters: ReportFilters = {};
  for (const key of keys) {
    const value = values[key]?.trim();
    if (!value) {
      continue;
    }
    if (key === 'months') {
      filters.months = Number(value);
    } else {
      filters[key] = value;
    }
  }
  return filters;
}

/**
 * Generate-report form. The type list is already narrowed to what the caller
 * may generate; field-level validation (lengths, date order, cohort size) is
 * left to the backend and its message is shown as returned.
 */
export default function ReportGenerator({ options }: { options: ReportTypeOption[] }) {
  const router = useRouter();
  const [type, setType] = useState<ReportType>(options[0]?.type ?? 'treatment_effectiveness');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [values, setValues] = useState<Partial<Record<ReportFilterKey, string>>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = options.find((option) => option.type === type) ?? options[0];

  if (!selected) {
    return <p className="text-sm opacity-70">Your role cannot generate any report type.</p>;
  }

  function changeType(next: ReportType) {
    setType(next);
    setValues({});
    setError(null);
    setNotice(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const body: ReportGenerateRequest = {
      report_type: selected.type,
      format,
      filters: buildFilters(selected.filters, values),
    };
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => ({}));
        const detail =
          payload && typeof payload === 'object' ? (payload as { detail?: unknown }).detail : undefined;
        setError(describeFailure(response.status, detail).message);
        return;
      }
      setNotice(`${selected.label} report generated. It is at the top of your history.`);
      router.refresh();
    } catch {
      setError(describeFailure(null, undefined).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Generate report">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="opacity-70">Report type</span>
          <select
            value={selected.type}
            onChange={(event) => changeType(event.target.value as ReportType)}
            className={inputClass}
          >
            {options.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="opacity-70">Export format</span>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as ReportFormat)}
            className={inputClass}
          >
            {REPORT_FORMATS.map((option) => (
              <option key={option.format} value={option.format}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs opacity-70">{selected.description}</p>

      {selected.filters.length > 0 ? (
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-2 text-sm font-medium opacity-80">Filters (optional)</legend>
          {selected.filters.map((key) => (
            <label key={key} className="space-y-1 text-sm">
              <span className="opacity-70">{FILTER_LABELS[key]}</span>
              {key === 'months' ? (
                <select
                  value={values.months ?? ''}
                  onChange={(event) => setValues({ ...values, months: event.target.value })}
                  className={inputClass}
                >
                  <option value="">Default (12)</option>
                  {MONTH_OPTIONS.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={key === 'date_from' || key === 'date_to' ? 'date' : 'text'}
                  value={values[key] ?? ''}
                  onChange={(event) => setValues({ ...values, [key]: event.target.value })}
                  className={inputClass}
                />
              )}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="text-xs opacity-60">This report type has no filters.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Generating…' : 'Generate report'}
        </button>
        {notice && (
          <p role="status" className="text-sm text-green-600">
            {notice}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
