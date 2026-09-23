import { NextResponse } from 'next/server';

import { apiFetch, ApiError } from '@/lib/api';
import { getToken } from '@/lib/session';

/** Trigger a 30-day readmission forecast for one admission. Mirrors ./predict/route.ts. */
export async function POST(request: Request) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  let patientId: number;
  let admissionId: number;
  try {
    const body = await request.json();
    patientId = Number(body.patient_id);
    admissionId = Number(body.admission_id);
  } catch {
    return NextResponse.json({ detail: 'Invalid request body' }, { status: 400 });
  }
  if (!Number.isFinite(patientId) || !Number.isFinite(admissionId)) {
    return NextResponse.json(
      { detail: 'patient_id and admission_id are both required' },
      { status: 400 },
    );
  }

  try {
    const result = await apiFetch(
      '/risk/readmission',
      {
        method: 'POST',
        body: JSON.stringify({ patient_id: patientId, admission_id: admissionId }),
        cache: 'no-store',
      },
      token,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      const detail =
        {
          404: 'That patient or admission is not available to you.',
          422: 'Not enough data to forecast this admission yet.',
          503: 'No trained readmission model is available yet.',
        }[error.status] ?? 'Could not forecast this admission.';
      return NextResponse.json({ detail }, { status: error.status });
    }
    return NextResponse.json({ detail: 'Could not reach the server' }, { status: 502 });
  }
}
