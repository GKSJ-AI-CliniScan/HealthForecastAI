import { invalidId, parseId, proxyToBackend } from '@/lib/proxy';

/** Stream a stored report file, keeping the backend's content type and file name. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (id === null) {
    return invalidId();
  }
  return proxyToBackend(`/reports/${id}/download`);
}
