'use client';

import { useSyncExternalStore } from 'react';

import { THEME_STORAGE_KEY } from './themeScript';

type Theme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const matchDark = () =>
  typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;

/** The explicit choice on <html> if there is one, otherwise the system setting. */
function currentTheme(): Theme {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit === 'dark' || explicit === 'light') {
    return explicit;
  }
  return matchDark()?.matches ? 'dark' : 'light';
}

/** Re-render when the choice changes (from any toggle) or the system setting does. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const media = matchDark();
  media?.addEventListener?.('change', onChange);
  return () => {
    observer.disconnect();
    media?.removeEventListener?.('change', onChange);
  };
}

function toggleTheme() {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage can be blocked (private window); the choice still applies to this page view.
  }
}

/**
 * Switches between the light and dark theme. The choice is kept in this
 * browser only (localStorage) and is applied by the script in the root layout.
 * Until the viewer chooses, the system setting decides.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  // The server cannot know the theme, so it renders with no pressed state.
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null);
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={theme === null ? undefined : theme === 'dark'}
      className={`btn btn-secondary btn-sm aria-pressed:border-brand aria-pressed:bg-brand-tint aria-pressed:text-brand ${className}`}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true" focusable="false">
        <path
          d="M13.5 9.6A5.7 5.7 0 0 1 6.4 2.5a5.7 5.7 0 1 0 7.1 7.1Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      Dark mode
    </button>
  );
}
