'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(token ? '/dashboard' : '/login');
  }, [token, loading, router]);

  return (
    <main className="grid min-h-screen place-items-center">
      <p className="muted text-sm">Loading HealthForecast AI…</p>
    </main>
  );
}
