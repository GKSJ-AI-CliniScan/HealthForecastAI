'use client';

import Link from 'next/link';
import { useState } from 'react';
import { EmptyBlock, ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/lib/auth';
import type { Page, Patient } from '@/types';

const PAGE_SIZE = 25;

export default function PatientsPage() {
  const { hasRole } = useAuth();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const path =
    `/patients?limit=${PAGE_SIZE}&offset=${offset}` +
    (query ? `&search=${encodeURIComponent(query)}` : '');
  const { data, error, loading } = useApi<Page<Patient>>(path);

  const isDoctor = hasRole('doctor');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="muted mt-1 text-sm">
            {isDoctor
              ? 'Patients assigned to you. Records outside your caseload are not listed.'
              : 'Hospital-wide patient record, read only.'}
          </p>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setOffset(0);
            setQuery(search);
          }}
        >
          <input
            className="input"
            style={{ minWidth: 220 }}
            placeholder="Search MRN or diagnosis"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search patients"
          />
          <button type="submit" className="btn">
            Search
          </button>
        </form>
      </header>

      {error ? <ErrorBlock message={error} /> : null}
      {loading ? <Loading /> : null}

      {!loading && data && data.items.length === 0 ? (
        <EmptyBlock
          message={
            query
              ? `No patients match "${query}".`
              : 'No patients are assigned to you yet.'
          }
        />
      ) : null}

      {!loading && data && data.items.length > 0 ? (
        <>
          <div className="table-wrap">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">MRN</th>
                  <th className="th">Age band</th>
                  <th className="th">Gender</th>
                  <th className="th">Primary diagnosis</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((patient) => (
                  <tr key={patient.id}>
                    <td className="td font-medium">{patient.medical_record_number}</td>
                    <td className="td">{patient.age_group ?? '—'}</td>
                    <td className="td">{patient.gender ?? '—'}</td>
                    <td className="td">{patient.primary_diagnosis ?? '—'}</td>
                    <td className="td text-right">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="text-sm font-medium"
                        style={{ color: 'var(--accent)' }}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="muted text-sm">
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of{' '}
              {data.total.toLocaleString()}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={offset + PAGE_SIZE >= data.total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
