'use client';

import { useRouter } from 'next/navigation';

/** Clears the session cookie and returns the user to the login screen. */
export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch('/api/session', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
    >
      Sign out
    </button>
  );
}
