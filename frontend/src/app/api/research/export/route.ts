import { proxyToBackend } from '@/lib/proxy';

const COHORT_FILTERS = ['diagnosis', 'gender', 'age_band', 'date_from', 'date_to'] as const;

/**
 * Download the anonymised research CSV. Only the known cohort filters are
 * forwarded; their values are validated, and the cohort-size guard applied,
 * by the backend.
 */
export async function GET(request: Request) {
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of COHORT_FILTERS) {
    const value = incoming.get(key);
    if (value) {
      query.set(key, value);
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return proxyToBackend(`/analytics/research-export${suffix}`);
}
