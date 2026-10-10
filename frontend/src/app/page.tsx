'use client';
/**
 * page.tsx ("/") — no landing page: a hospital tool should open straight to work.
 * Signed in → Home (/dashboard). Not signed in → Sign in.
 */
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useSession } from '@/lib/session';

export default function Root() {
  const { user, ready } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(user ? '/dashboard' : '/login');
  }, [ready, user, router]);
  return null;
}
