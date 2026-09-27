import { NextResponse } from 'next/server';

import { ApiError, apiRequest } from './api';
import { getToken } from './session';

/** Headers of a file response that must survive the proxy hop. */
const PASSTHROUGH_HEADERS = ['content-type', 'content-disposition', 'content-length'];

/**
 * Forward a request to the backend with the caller's session token.
 *
 * Client components cannot call the backend directly - the token lives in an
 * httpOnly cookie (lib/session.ts) - so the route handlers under app/api use
 * this to relay the call. The backend's status and `detail` are passed through
 * unchanged: validation and authorisation stay in the backend, and the client
 * turns the detail into a message with lib/errors.ts.
 */
export async function proxyToBackend(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }

  try {
    const upstream = await apiRequest(path, { ...init, cache: 'no-store' }, token);
    if (upstream.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const headers = new Headers();
    for (const name of PASSTHROUGH_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) {
        headers.set(name, value);
      }
    }
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ detail: error.detail ?? null }, { status: error.status });
    }
    return NextResponse.json({ detail: 'Could not reach the server' }, { status: 502 });
  }
}

/** Accept only a positive integer id, so a path segment can never rewrite the backend URL. */
export function parseId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

export function invalidId(): Response {
  return NextResponse.json({ detail: 'Invalid id' }, { status: 400 });
}
