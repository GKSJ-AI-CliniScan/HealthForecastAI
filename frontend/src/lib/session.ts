import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { apiFetch } from './api';
import type { Role, User } from '@/types';

/**
 * Name of the httpOnly cookie holding the access token.
 *
 * The token is deliberately never exposed to client JavaScript: lib/api.ts
 * requires an httpOnly cookie so that a cross-site scripting bug cannot read a
 * clinician's credentials out of localStorage.
 */
export const SESSION_COOKIE = 'hfai_session';

export interface SessionUser {
  subject: string;
  role: Role;
  permissions: string[];
  profile: User | null;
}

/** Return the access token from the session cookie, if the caller has one. */
export async function getToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

/**
 * Resolve the signed-in user, or null when there is no usable session.
 *
 * The backend re-checks the account on every request, so an expired token or a
 * deactivated account resolves to null here rather than to a stale identity.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getToken();
  if (!token) {
    return null;
  }
  try {
    return await apiFetch<SessionUser>('/auth/me', { cache: 'no-store' }, token);
  } catch {
    return null;
  }
}

/** Return the signed-in user, or send an anonymous caller to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Return true when the user holds a permission.
 *
 * This drives which navigation a role is shown. It is presentation only - the
 * backend authorises every request independently, because a hidden menu item is
 * not access control.
 */
export function can(user: SessionUser, permission: string): boolean {
  return user.permissions.includes(permission);
}
