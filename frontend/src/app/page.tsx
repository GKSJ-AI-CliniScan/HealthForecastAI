import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Send visitors to their dashboard, or to the login screen if signed out. */
export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? '/dashboard' : '/login');
}
