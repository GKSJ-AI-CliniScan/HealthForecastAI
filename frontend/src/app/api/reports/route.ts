import { NextResponse } from 'next/server';

import { proxyToBackend } from '@/lib/proxy';

/**
 * Generate a report. The JSON body is relayed as-is: the backend owns
 * validation of report type, format and per-type filters.
 */
export async function POST(request: Request) {
  let body: string;
  try {
    body = JSON.stringify(await request.json());
  } catch {
    return NextResponse.json({ detail: 'Invalid request body' }, { status: 400 });
  }
  return proxyToBackend('/reports/generate', { method: 'POST', body });
}
