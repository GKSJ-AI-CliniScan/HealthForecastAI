'use client';

import { useState } from 'react';
import { EmptyBlock, ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import type { AuditPage } from '@/types';

const PAGE = 50;

export default function AuditPage() {
  const [offset, setOffset] = useState(0);
  const [outcome, setOutcome] = useState('');
  const query = `/audit?limit=${PAGE}&offset=${offset}${outcome ? `&outcome=${outcome}` : ''}`;
  const { data, error, loading } = useApi<AuditPage>(query);

  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit trail</h1>
          <p className="muted mt-1 text-sm">
            Who read, exported or changed what. Append-only; reading this page is itself recorded.
          </p>
        </div>
        <select
          className="rounded-lg border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          value={outcome}
          onChange={(e) => {
            setOffset(0);
            setOutcome(e.target.value);
          }}
          aria-label="Outcome"
        >
          <option value="">All outcomes</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="inactive">Inactive account</option>
        </select>
      </header>

      {loading && !data ? <Loading /> : null}
      {data && data.items.length === 0 ? <EmptyBlock message="No matching entries." /> : null}
      {data && data.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">When</th>
                  <th className="th">Actor</th>
                  <th className="th">Action</th>
                  <th className="th">Resource</th>
                  <th className="th">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="td whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="td">
                      {row.actor_id ? `#${row.actor_id}` : '—'}
                      {row.actor_role ? ` · ${row.actor_role}` : ''}
                    </td>
                    <td className="td font-medium">{row.action}</td>
                    <td className="td">{row.resource ?? '—'}</td>
                    <td
                      className="td"
                      style={{ color: row.outcome === 'success' ? undefined : '#8a1c12' }}
                    >
                      {row.outcome}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="muted">
              {offset + 1}–{offset + data.items.length} of {data.total.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE))}
              >
                Newer
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={offset + PAGE >= data.total}
                onClick={() => setOffset(offset + PAGE)}
              >
                Older
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
