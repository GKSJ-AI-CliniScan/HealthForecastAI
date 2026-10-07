'use client';
/** Custom 404 — plain words + one way back. */
import Link from 'next/link';

import { useI18n } from '@/i18n/I18nProvider';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main id="main" className="mx-auto max-w-md px-4 py-16 text-center">
      <p aria-hidden="true" className="mb-4 text-6xl font-bold text-teal">
        404
      </p>
      <h1 className="mb-6 text-3xl font-bold">{t('common.notFound')}</h1>
      <Link href="/dashboard" className="text-lg font-semibold text-teal-dark underline">
        {t('a11y.sc.home')}
      </Link>
    </main>
  );
}
