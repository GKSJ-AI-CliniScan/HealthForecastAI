'use client';
/**
 * AppShell.tsx — the frame around every signed-in page.
 *
 * LAYOUT (top to bottom, same on every page so users learn it once):
 *   [Skip to main content]            ← first Tab stop, for keyboard/screen-reader users
 *   header: app name | Language ▾ | ⏹ Stop | 🎤 Speak | Sign out   (Read aloud sits next to each page title)
 *   nav:    big buttons for the pages this role may open (from lib/nav.ts)
 *   banner: "Showing sample data" (demo mode only)
 *   main:   the page (id="main" — target of skip link and of Read aloud)
 *   footer: watermark
 *
 * ACCESS GUARD: `page` prop = which page this is. Not signed in → /login.
 * Signed in but role not allowed → friendly message (backend enforces it too).
 * FLOWS NEXT: every page wraps itself in <AppShell page="…">.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { useA11y } from '@/a11y/A11yProvider';
import { DATA_MODE } from '@/config';
import { useI18n } from '@/i18n/I18nProvider';
import { canOpen, pagesFor, type PageId } from '@/lib/nav';
import { useSession } from '@/lib/session';
import { LanguagePicker } from './LanguagePicker';
import { Watermark } from './Watermark';

export function AppShell({ page, children }: { page: PageId; children: ReactNode }) {
  const { user, ready, logout } = useSession();
  const { t } = useI18n();
  const { stop, listen, listening, status } = useA11y();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Not signed in → sign-in page (after storage has been checked, see session.tsx).
  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  useEffect(() => setMenuOpen(false), [pathname]); // close the phone menu after navigating

  if (!ready || !user) {
    return (
      <p role="status" className="p-8 text-xl">
        {t('common.loading')}
      </p>
    );
  }

  const pages = pagesFor(user.role);
  const allowed = canOpen(user.role, page);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a href="#main" className="skip-link">
        {t('a11y.skip')}
      </a>

      <header className="border-b-2 border-line bg-paper-raised">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/dashboard" className="mr-auto flex items-center gap-2 text-2xl font-bold text-teal-dark">
            <span aria-hidden="true">✚</span>
            {t('app.name')}
          </Link>
          <LanguagePicker />
          <ToolButton label={t('a11y.stop')} icon="⏹" onClick={stop} />
          <ToolButton label={t('a11y.listen')} icon="🎤" onClick={listen} active={listening} />
          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="min-h-[48px] rounded-xl border-2 border-line px-3 text-lg font-semibold hover:bg-paper-sunk"
          >
            {t('auth.logout')}
          </button>
        </div>
        {/* Spoken/visible status of voice features (e.g. "Listening…"). */}
        {status && (
          <p className="mx-auto max-w-6xl px-4 pb-2 text-base text-ink-soft" aria-hidden="true">
            {status}
          </p>
        )}
      </header>

      <nav aria-label={t('nav.menu')} className="border-b-2 border-line bg-paper-sunk">
        <div className="mx-auto max-w-6xl px-4 py-2">
          {/* Phones: one big "Menu" button; larger screens: all items visible. */}
          <button
            type="button"
            className="min-h-[48px] w-full rounded-xl border-2 border-line bg-paper-raised text-lg font-semibold md:hidden"
            aria-expanded={menuOpen}
            aria-controls="main-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            ☰ {t('nav.menu')}
          </button>
          <ul id="main-menu" className={`${menuOpen ? 'flex' : 'hidden'} mt-2 flex-col gap-2 md:mt-0 md:flex md:flex-row md:flex-wrap`}>
            {pages.map((p, i) => {
              const current = pathname === p.href || pathname.startsWith(`${p.href}/`);
              return (
                <li key={p.id}>
                  <Link
                    href={p.href}
                    aria-current={current ? 'page' : undefined}
                    aria-keyshortcuts={i < 9 ? `Alt+Shift+${i + 1}` : undefined}
                    className={`flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-lg font-semibold ${
                      current ? 'bg-teal text-white' : 'bg-paper-raised text-ink hover:bg-paper'
                    }`}
                  >
                    <span aria-hidden="true">{p.icon}</span>
                    {t(p.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {DATA_MODE === 'demo' && (
        <p role="note" className="bg-marigold-bg px-4 py-2 text-center text-lg font-semibold text-ink">
          ⓘ {t('common.sampleData')}
        </p>
      )}

      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 outline-none">
        {allowed ? (
          children
        ) : (
          <div role="alert" className="rounded-2xl border-2 border-rhigh bg-rhigh-bg p-6 text-xl font-semibold text-rhigh">
            <h1 tabIndex={-1}>{t('common.noAccess')}</h1>
          </div>
        )}
      </main>

      <Watermark />
    </div>
  );
}

/** Icon button with a visible label on wide screens and an accessible name always. */
function ToolButton({ label, icon, onClick, active }: { label: string; icon: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-xl border-2 px-3 text-lg font-semibold ${
        active ? 'border-marigold bg-marigold-bg' : 'border-line hover:bg-paper-sunk'
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}
