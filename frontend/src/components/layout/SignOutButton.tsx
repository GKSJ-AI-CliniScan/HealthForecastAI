'use client';

import { useRouter } from 'next/navigation';

import { SignOutIcon } from './icons';

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
      className="btn btn-secondary btn-sm w-full"
    >
      <SignOutIcon className="h-4 w-4" />
      Sign out
    </button>
  );
}
