import { NextResponse } from 'next/server';

import { apiFetch, ApiError } from '@/lib/api';
import { getToken } from '@/lib/session';

/**
 * Trigger a risk score for a patient.
 *
 * A client component cannot call the backend directly - the session token
 * lives in an httpOnly cookie by design (see lib/session.ts) - so this route
 * reads it server-side and proxies the request, the same pattern
 * app/api/session/route.ts uses for login.
 */
export async function POST(request: Request) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  let patientId: number;
  try {
    const body = await request.json();
    patientId = Number(body.patient_id);
  } catch {
    return NextResponse.json({ detail: 'Invalid request body' }, { status: 400 });
  }
  if (!Number.isFinite(patientId)) {
    return NextResponse.json({ detail: 'patient_id is required' }, { status: 400 });
  }

  try {
    const result = await apiFetch(
      '/risk/predict',
      { method: 'POST', body: JSON.stringify({ patient_id: patientId }), cache: 'no-store' },
      token,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      const detail =
        {
          404: 'That patient is not available to you.',
          422: 'Not enough admission history to score this patient yet.',
          503: 'No trained risk model is available yet.',
        }[error.status] ?? 'Could not score this patient.';
      return NextResponse.json({ detail }, { status: error.status });
    }
    return NextResponse.json({ detail: 'Could not reach the server' }, { status: 502 });
  }
}
