import Link from 'next/link';

/**
 * Dashboard not-found boundary.
 *
 * Also the response when a patient lies outside the caller's scope: the backend
 * returns 404 rather than 403 so that the existence of another clinician's
 * patient is never confirmed. The wording therefore covers both cases without
 * hinting which one occurred.
 */
export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-5 py-12 text-center">
      <div>
        <h1 className="text-xl font-semibold">Not available</h1>
        <p className="mt-2 text-sm opacity-70">
          This record either does not exist or is not part of the data your role can access. If you
          expected to see a patient here, check with your administrator that they are assigned to
          you.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 text-sm">
        <Link
          href="/dashboard"
          className="rounded-md bg-[var(--foreground)] px-4 py-2 font-medium text-[var(--background)]"
        >
          Back to overview
        </Link>
        <Link
          href="/dashboard/patients"
          className="rounded-md border border-[var(--border)] px-4 py-2 font-medium"
        >
          View patients
        </Link>
      </div>
    </div>
  );
}
