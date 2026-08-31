import { NextResponse } from 'next/server';

import { apiFetch, ApiError } from '@/lib/api';
import { SESSION_COOKIE } from '@/lib/session';

interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  permissions: string[];
}

/**
 * Exchange credentials for a session cookie.
 *
 * The browser never sees the access token: this handler calls the backend, then
 * stores the token in an httpOnly cookie that only the server can read. That is
 * what lib/api.ts asks for, and it keeps a scripting bug from lifting a
 * clinician's credentials.
 */
export async function POST(request: Request) {
  let email: string;
  let password: string;

  try {
    const body = await request.json();
    email = String(body.email ?? '');
    password = String(body.password ?? '');
  } catch {
    return NextResponse.json({ detail: 'Invalid request body' }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json(
      { detail: 'Email and password are both required' },
      { status: 400 },
    );
  }

  try {
    const session = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    const response = NextResponse.json({ role: session.role });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: session.access_token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      // Matches the backend's ACCESS_TOKEN_EXPIRE_MINUTES default of 30.
      maxAge: 60 * 30,
    });
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      const detail =
        error.status === 401
          ? 'Incorrect email or password'
          : 'This account cannot sign in';
      return NextResponse.json({ detail }, { status: error.status });
    }
    return NextResponse.json({ detail: 'Could not reach the server' }, { status: 502 });
  }
}

/** Sign out by clearing the session cookie. */
export async function DELETE() {
  const response = NextResponse.json({ signedOut: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
