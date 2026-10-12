import Link from 'next/link';

import BrandMark from '@/components/layout/BrandMark';

/** Shown for any address that does not match a page. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[1.0625rem] font-bold text-ink">HealthForecast AI</span>
        </div>
        <h1 className="mt-10 text-title text-ink">Page not found</h1>
        <p className="mt-2 text-ink-muted">
          The address may be mistyped, or the page may have moved.
        </p>
        <Link href="/dashboard" className="btn btn-primary mt-8">
          Go to your dashboard
        </Link>
      </div>
    </main>
  );
}
