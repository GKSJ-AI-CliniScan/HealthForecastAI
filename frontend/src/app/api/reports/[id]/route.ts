import { invalidId, parseId, proxyToBackend } from '@/lib/proxy';

/** Delete one report. Ownership is enforced by the backend (404 if not yours). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (id === null) {
    return invalidId();
  }
  return proxyToBackend(`/reports/${id}`, { method: 'DELETE' });
}
