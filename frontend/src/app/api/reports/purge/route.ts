import { proxyToBackend } from '@/lib/proxy';

/** Retention purge (system administrators only - enforced by the backend). */
export async function POST() {
  return proxyToBackend('/reports/purge', { method: 'POST' });
}
