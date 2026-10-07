'use client';
/**
 * AppShell.tsx — the frame around every signed-in page.
 *
 * v2 LAYOUT (benchmarked against the team's best UI, kept just as easy):
 *   desktop:  [ sidebar: brand · menu with icons · you + Sign out ] [ top bar + page ]
 *   phone:    top bar with a "Menu" button → the same sidebar slides in as a drawer
 *   top bar:  Language ▾ · ⏹ Stop reading · 🎤 Speak a command · ☾ Dark mode
 *   [Skip to main content] stays the first Tab stop; main has id="main" (Read aloud target).
 *
 * ACCESS GUARD: `page` prop = which page this is. Not signed in → /login.
 * Signed in but role not allowed → friendly message (backend enforces it too).
 * FLOWS NEXT: every page wraps itself in <AppShell page="…">.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Info, LogOut, Menu, Mic, Moon, Square, Sun, X } from 'lucide-react';

import { useA11y } from '@/a11y/A11yProvider';
import { DATA_MODE } from '@/config';
import { useI18n } from '@/i18n/I18nProvider';
import { canOpen, pagesFor, type PageId } from '@/lib/nav';
import { useSession } from '@/lib/session';
import { BrandIcon, PAGE_ICON } from './icons';
import { LanguagePicker } from './LanguagePicker';
import { Avatar } from './ui';
import { Watermark } from './Watermark';

export function AppShell({ page, children }: { page: PageId; children: ReactNode }) {
  const { user, ready, logout } = useSession();
  const { t } = useI18n();
  const { stop, listen, listening, status, settings, update } = useA11y();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Not signed in → sign-in page (after storage has been checked, see session.tsx).
  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  useEffect(() => setMenuOpen(false), [pathname]); // close the phone drawer after navigating

  // Escape closes the drawer (keyboard users must never get stuck in it).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  if (!ready || !user) {
    return (
      <p role="status" className="p-8 text-lg">
        {t('common.loading')}
      </p>
    );
  }

  const pages = pagesFor(user.role);
  const allowed = canOpen(user.role, page);
  const signOut = () => {
    logout();
    router.push('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5">
        <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-teal text-on-teal shadow-sm">
          <BrandIcon size={22} />
        </span>
        <span className="leading-tight">
          <span className="block text-lg font-bold text-ink">{t('app.name')}</span>
          <span className="block text-xs text-ink-soft">{t(`role.${user.role}`)}</span>
        </span>
      </Link>

      <nav aria-label={t('nav.menu')} className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {pages.map((p, i) => {
            const current = pathname === p.href || pathname.startsWith(`${p.href}/`);
            const Icon = PAGE_ICON[p.id];
            return (
              <li key={p.id}>
                <Link
                  href={p.href}
                  aria-current={current ? 'page' : undefined}
                  aria-keyshortcuts={i < 9 ? `Alt+Shift+${i + 1}` : undefined}
                  className={`relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium transition-colors ${
                    current ? 'bg-teal-bg font-semibold text-teal-dark' : 'text-ink-soft hover:bg-paper-sunk hover:text-ink'
                  }`}
                >
                  {/* left accent bar = second, non-colour cue for "you are here" (plus aria-current) */}
                  {current && <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-teal" />}
                  <Icon aria-hidden="true" size={20} />
                  {t(p.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line p-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar name={user.name} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-semibold text-ink">{user.name}</span>
            <span className="block truncate text-xs text-ink-soft">{user.email}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-paper-sunk"
        >
          <LogOut aria-hidden="true" size={18} />
          {t('auth.logout')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a href="#main" className="skip-link">
        {t('a11y.skip')}
      </a>

      {/* Desktop sidebar (always visible from lg). */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line bg-paper-raised lg:block">{sidebar}</aside>

      {/* Phone/tablet drawer: same content, opened by the Menu button. */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={t('common.close')}
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <aside id="main-menu" className="relative h-full w-[85%] max-w-xs bg-paper-raised shadow-xl">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label={t('common.close')}
              className="absolute right-3 top-4 grid h-11 w-11 place-items-center rounded-xl hover:bg-paper-sunk"
            >
              <X aria-hidden="true" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-line bg-paper-raised">
          <div className="flex items-center gap-1.5 px-3 py-2.5 sm:gap-2 sm:px-6">
            <button
              type="button"
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="main-menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu aria-hidden="true" size={20} />
              {t('nav.menu')}
            </button>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <LanguagePicker compact />
              <ToolButton label={t('a11y.stop')} onClick={stop}>
                <Square size={16} />
              </ToolButton>
              <ToolButton label={t('a11y.listen')} onClick={listen} active={listening}>
                <Mic size={18} />
              </ToolButton>
              <ToolButton label={t('a11y.dark')} onClick={() => update({ dark: !settings.dark })} active={settings.dark}>
                {settings.dark ? <Sun size={18} /> : <Moon size={18} />}
              </ToolButton>
            </div>
          </div>
          {/* Visible status of voice features (e.g. "Listening…"); the announcer speaks it. */}
          {status && (
            <p className="px-6 pb-2 text-sm text-ink-soft" aria-hidden="true">
              {status}
            </p>
          )}
        </header>

        {DATA_MODE === 'demo' && (
          <p role="note" className="flex items-center justify-center gap-2 bg-marigold-bg px-4 py-2 text-sm font-semibold text-ink">
            <Info aria-hidden="true" size={16} />
            {t('common.sampleData')}
          </p>
        )}

        <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6 outline-none sm:px-6 lg:py-8">
          {allowed ? (
            children
          ) : (
            <div role="alert" className="rounded-2xl border border-rhigh bg-rhigh-bg p-6 text-lg font-semibold text-rhigh">
              <h1 tabIndex={-1}>{t('common.noAccess')}</h1>
            </div>
          )}
        </main>

        <Watermark />
      </div>
    </div>
  );
}

/** Square icon button; its accessible name (and tooltip) is the translated label. */
function ToolButton({ label, children, onClick, active }: { label: string; children: ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid h-11 w-11 place-items-center rounded-xl border transition-colors ${
        active ? 'border-teal bg-teal-bg text-teal-dark' : 'border-line text-ink-soft hover:bg-paper-sunk hover:text-ink'
      }`}
    >
      <span aria-hidden="true" className="inline-flex">
        {children}
      </span>
    </button>
  );
}
