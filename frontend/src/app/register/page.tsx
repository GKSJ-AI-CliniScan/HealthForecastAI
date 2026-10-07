'use client';
/**
 * /register — self sign-up does not exist on purpose: in the backend only the
 * System Administrator (user:manage) can create accounts (POST /users).
 * This page just explains that and links back to sign-in.
 */
import Link from 'next/link';

import { useI18n } from '@/i18n/I18nProvider';

export default function RegisterPage() {
  const { t } = useI18n();
  return (
    <main id="main" className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-4 text-3xl font-bold">{t('auth.title')}</h1>
      <p className="mb-6 text-lg">{t('auth.noAccount')}</p>
      <Link href="/login" className="text-lg font-semibold text-teal-dark underline">
        {t('auth.submit')}
      </Link>
    </main>
  );
}
