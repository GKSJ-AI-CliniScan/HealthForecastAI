'use client';
/**
 * A11yProvider.tsx — all features for blind and low-vision users live here.
 *
 * WHAT IT GIVES THE APP:
 *   settings    text size, high contrast, reduce movement, talking buttons,
 *               auto-read page title, reading speed — saved in localStorage and
 *               applied as classes on <html> (globals.css does the styling)
 *   announce()  writes into an aria-live region → screen readers (TalkBack,
 *               NVDA, VoiceOver) speak it without moving focus ("Patients page opened")
 *   readPage()  reads the <main> region aloud with the browser's own voice —
 *               for blind users who do NOT have a screen reader installed
 *   listen()    "Speak a command": say a menu name in your language
 *   shortcuts   Alt+Shift+R read, S stop, V voice, H home, 1-9 menu items
 *
 * WHY BOTH screen-reader support AND our own voice: many first-time users in
 * India have no screen reader set up. Proper HTML (labels, headings, landmarks)
 * serves screen-reader users; the built-in voice serves everyone else.
 * FLOWS NEXT: AppShell renders the toolbar buttons that call these; the Help
 * page renders the settings form.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { pagesFor, pageForPath } from '@/lib/nav';
import { useSession } from '@/lib/session';
import { canListen, listenOnce, speak, stopSpeaking } from './speech';
import { matchCommand, type VoiceCommand } from './voiceCommands';

export type TextSize = 'normal' | 'large' | 'xlarge';
export type Speed = 'slow' | 'normal' | 'fast';

export interface A11ySettings {
  textSize: TextSize;
  contrast: boolean;
  reduceMotion: boolean;
  talking: boolean;
  autoRead: boolean;
  speed: Speed;
}

const DEFAULTS: A11ySettings = {
  textSize: 'normal',
  contrast: false,
  reduceMotion: false,
  talking: false,
  autoRead: false,
  speed: 'normal',
};
const RATE: Record<Speed, number> = { slow: 0.8, normal: 1, fast: 1.25 };
const STORAGE_KEY = 'hf_a11y';

interface A11yState {
  settings: A11ySettings;
  update: (patch: Partial<A11ySettings>) => void;
  announce: (message: string) => void;
  say: (text: string) => void;
  readPage: () => void;
  stop: () => void;
  listen: () => void;
  listening: boolean;
  /** last voice-feature message to show on screen too (deaf-blind/low-vision) */
  status: string;
}

const A11yContext = createContext<A11yState | null>(null);

export function A11yProvider({ children }: { children: ReactNode }) {
  const { t, tEn, info } = useI18n();
  const { user, logout } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [settings, setSettings] = useState<A11ySettings>(DEFAULTS);
  const [message, setMessage] = useState(''); // content of the aria-live region
  const [status, setStatus] = useState('');
  const [listening, setListening] = useState(false);

  // ---- settings: load once, save + apply on every change ----
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<A11ySettings>) });
    } catch {
      /* defaults */
    }
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.textSize = settings.textSize; // globals.css: html[data-text-size="large"] { font-size: … }
    html.classList.toggle('hc', settings.contrast);
    html.classList.toggle('reduce-motion', settings.reduceMotion);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* not saved */
    }
  }, [settings]);

  const update = useCallback((patch: Partial<A11ySettings>) => setSettings((s) => ({ ...s, ...patch })), []);

  // ---- announce: clear then set, so repeating the same text is announced again ----
  const announce = useCallback((text: string) => {
    setMessage('');
    window.setTimeout(() => setMessage(text), 50);
  }, []);

  // ---- our own voice ----
  const say = useCallback(
    (text: string) => {
      void speak(text, info, RATE[settings.speed]).then((r) => {
        if (r === 'no_voice') {
          const msg = t('a11y.noVoice', { lang: info.native });
          setStatus(msg);
          announce(msg);
        }
      });
    },
    [info, settings.speed, t, announce],
  );

  const readPage = useCallback(() => {
    // Read only the main content, skipping anything marked data-no-read (e.g. big tables' raw numbers).
    const main = document.getElementById('main');
    if (!main) return;
    const clone = main.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-no-read], [aria-hidden="true"], script, style').forEach((n) => n.remove());
    say(clone.innerText);
  }, [say]);

  const stop = useCallback(() => {
    stopSpeaking();
    setStatus('');
  }, []);

  // ---- voice commands ----
  const commands = useMemo<VoiceCommand[]>(() => {
    const both = (k: TKey) => [t(k), tEn(k)];
    const list: VoiceCommand[] = [
      { action: 'read', phrases: [...both('a11y.read'), ...both('a11y.sc.read')] },
      { action: 'stop', phrases: both('a11y.stop') },
      { action: 'back', phrases: both('common.back') },
      { action: 'logout', phrases: both('auth.logout') },
    ];
    if (user) {
      for (const p of pagesFor(user.role)) list.push({ action: `go:${p.href}`, phrases: both(p.labelKey) });
    }
    return list;
  }, [t, tEn, user]);

  const run = useCallback(
    (action: string) => {
      if (action === 'read') readPage();
      else if (action === 'stop') stop();
      else if (action === 'back') router.back();
      else if (action === 'logout') {
        logout();
        router.push('/login');
      } else if (action.startsWith('go:')) router.push(action.slice(3));
    },
    [readPage, stop, router, logout],
  );

  const listen = useCallback(() => {
    if (!canListen()) {
      const msg = t('a11y.noMic');
      setStatus(msg);
      announce(msg);
      say(msg);
      return;
    }
    stopSpeaking(); // our own voice must not be "heard" as a command
    setListening(true);
    setStatus(t('a11y.listening'));
    announce(t('a11y.listening'));
    void listenOnce(info).result.then((guesses) => {
      setListening(false);
      const action = guesses.map((g) => matchCommand(g, commands)).find(Boolean);
      if (action) {
        setStatus(t('a11y.heard', { text: guesses[0] }));
        run(action);
      } else {
        const example = user ? t(pagesFor(user.role)[1]?.labelKey ?? 'nav.home') : t('nav.home');
        const msg = t('a11y.notUnderstood', { example });
        setStatus(msg);
        announce(msg);
        say(msg);
      }
    });
  }, [t, announce, say, info, commands, run, user]);

  // ---- talking buttons: speak the name of whatever gets keyboard focus ----
  useEffect(() => {
    if (!settings.talking) return;
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || el === document.body) return;
      const label =
        el.getAttribute('aria-label') ||
        (el.id && document.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`)?.innerText) ||
        el.innerText ||
        (el as HTMLInputElement).placeholder;
      if (label) say(label.slice(0, 140));
    };
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, [settings.talking, say]);

  // ---- every new page: announce it, move focus to its heading, optionally speak the title ----
  const firstRender = useRef(true);
  useEffect(() => {
    stopSpeaking(); // never keep reading the previous page
    if (firstRender.current) {
      firstRender.current = false;
      return; // do not steal focus on the very first load
    }
    const timer = window.setTimeout(() => {
      const h1 = document.querySelector<HTMLElement>('#main h1');
      h1?.focus(); // h1 has tabIndex=-1 (PageHeader) so focus is allowed
      const page = pageForPath(pathname);
      const name = h1?.innerText || (page ? t(page.labelKey) : '');
      if (name) announce(t('a11y.opened', { page: name }));
      if (settings.autoRead && name) {
        const help = document.querySelector<HTMLElement>('#main [data-page-help]')?.innerText ?? '';
        say(`${name}. ${help}`);
      }
    }, 300); // wait for the page to render its heading
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only on navigation
  }, [pathname]);

  // ---- keyboard shortcuts (Alt+Shift so they don't clash with browser/screen-reader keys) ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
      const k = e.code; // physical key → same shortcut on every keyboard layout/language
      if (k === 'KeyR') readPage();
      else if (k === 'KeyS') stop();
      else if (k === 'KeyV') listen();
      else if (k === 'KeyH') router.push('/dashboard');
      else if (/^Digit[1-9]$/.test(k) && user) {
        const page = pagesFor(user.role)[Number(k.slice(5)) - 1];
        if (page) router.push(page.href);
        else return;
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readPage, stop, listen, router, user]);

  const value = useMemo(
    () => ({ settings, update, announce, say, readPage, stop, listen, listening, status }),
    [settings, update, announce, say, readPage, stop, listen, listening, status],
  );

  return (
    <A11yContext.Provider value={value}>
      {children}
      {/* Screen readers speak changes here. Visually hidden, never focusable. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </div>
    </A11yContext.Provider>
  );
}

export function useA11y(): A11yState {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error('useA11y must be used inside <A11yProvider>');
  return ctx;
}
