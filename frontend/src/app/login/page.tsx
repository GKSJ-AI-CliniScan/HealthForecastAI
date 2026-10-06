'use client';
/**
 * Sign-in page (Milestone 1 — authentication).
 *
 * SIMPLE ON PURPOSE: language picker FIRST (so a non-English user can read the
 * rest), then just email + password + one big button. In demo mode, one-tap
 * buttons for the 4 roles. Errors are spoken by screen readers (role="alert")
 * and focus jumps to the first wrong field.
 * FLOWS NEXT: session.login() → data.login() → POST /auth/login → /dashboard.
 */
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { DATA_MODE } from '@/config';
import { ApiError } from '@/data';
import { DEMO_ACCOUNTS } from '@/data/demo';
import { useI18n } from '@/i18n/I18nProvider';
import { useSession } from '@/lib/session';
import { LanguagePicker } from '@/saral/LanguagePicker';
import { Watermark } from '@/saral/Watermark';
import { Button, Field, INPUT } from '@/saral/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { t } = useI18n();
  const { login, user, ready } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready && user) router.replace('/dashboard'); // already signed in
  }, [ready, user, router]);

  async function signIn(e?: string, p?: string) {
    setBusy(true);
    setErrors({});
    try {
      await login(e ?? email, p ?? password);
      router.push('/dashboard');
    } catch (err) {
      // offline gets its own message, so people don't retype a correct password forever
      setErrors({ form: err instanceof ApiError && err.kind === 'offline' ? t('common.offline') : t('auth.failed') });
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    // Validate before calling the server; move focus to the first problem.
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = email ? t('form.badEmail') : t('form.required');
    if (!password) next.password = t('form.required');
    setErrors(next);
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passRef.current?.focus();
    void signIn();
  }

  return (
    <div className="min-h-screen bg-paper">
      <a href="#main" className="skip-link">
        {t('a11y.skip')}
      </a>
      <div className="mx-auto flex max-w-6xl justify-end px-4 pt-4">
        <LanguagePicker id="lang-login" />
      </div>
      <main id="main" className="mx-auto max-w-md px-4 py-8">
        <p className="mb-2 flex items-center gap-2 text-2xl font-bold text-teal-dark">
          <span aria-hidden="true">✚</span>
          {t('app.name')}
        </p>
        <p className="mb-8 text-lg text-ink-soft">{t('app.tagline')}</p>
        <h1 className="mb-6 text-3xl font-bold">{t('auth.title')}</h1>

        {errors.form && (
          <p role="alert" className="mb-5 rounded-xl border-2 border-rhigh bg-rhigh-bg p-4 text-lg font-semibold text-rhigh">
            {errors.form}
          </p>
        )}

        <form onSubmit={onSubmit} noValidate>
          <Field id="email" label={t('auth.email')} error={errors.email}>
            <input
              ref={emailRef}
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-err' : undefined}
              className={INPUT}
            />
          </Field>
          <Field id="password" label={t('auth.password')} error={errors.password}>
            <input
              ref={passRef}
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-err' : undefined}
              className={INPUT}
            />
          </Field>
          <Button type="submit" disabled={busy} icon="→">
            {busy ? t('auth.busy') : t('auth.submit')}
          </Button>
        </form>

        {DATA_MODE === 'demo' && (
          <section className="mt-10" aria-labelledby="demo-h">
            <h2 id="demo-h" className="mb-3 text-lg font-semibold">
              {t('auth.demo')}
            </h2>
            <div className="grid gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <Button key={a.role} variant="quiet" disabled={busy} onClick={() => void signIn(a.email, 'demo')}>
                  {t(`role.${a.role}`)}
                </Button>
              ))}
            </div>
          </section>
        )}
        <p className="mt-8 text-base text-ink-soft">{t('auth.noAccount')}</p>
      </main>
      <Watermark />
    </div>
  );
}
