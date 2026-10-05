import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-bg px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl border border-warm-border shadow-sm">
        <div className="w-16 h-16 mx-auto bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 font-bold text-2xl">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-warm-text">Page Not Found</h1>
          <p className="text-sm text-warm-text-muted">
            The requested clinical record or application page could not be located.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
