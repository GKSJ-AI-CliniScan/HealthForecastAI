'use client';
/**
 * I18nProvider.tsx — makes `t('nav.home')` return text in the chosen language.
 *
 * HOW IT WORKS:
 *   1. English (en.json) is bundled in directly → always available, used as fallback.
 *   2. Other languages are loaded ON DEMAND with dynamic import(), so a user who
 *      only reads Tamil never downloads the other 21 files (smaller, faster on
 *      slow mobile networks).
 *   3. The choice is remembered in localStorage (it is a preference, not personal data).
 *   4. <html lang="ta" dir="ltr|rtl"> is updated, so screen readers switch to the
 *      right pronunciation and Urdu/Kashmiri/Sindhi lay out right-to-left.
 * FLOWS NEXT: every screen calls useI18n().t(); A11yProvider reads `lang` for speech.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import en from './locales/en.json';
import { DEFAULT_LANG, LANGUAGE_BY_CODE, guessLangFromBrowser, isLangCode, type LangCode, type LanguageInfo } from './languages';

/** Every valid key, derived from en.json — a typo in a key name fails the typecheck. */
export type TKey = keyof typeof en;
type Dict = Record<TKey, string>;

const STORAGE_KEY = 'hf_lang';

/** Loads one locale file. Webpack turns this template into 22 small chunks. */
async function loadDict(code: LangCode): Promise<Dict> {
  if (code === 'en') return en;
  const mod = (await import(`./locales/${code}.json`)) as { default: Dict };
  return mod.default;
}

/** Replaces {name}-style placeholders: fill('Hello, {name}', {name:'Asha'}). */
export function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

interface I18nState {
  lang: LangCode;
  info: LanguageInfo;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  /** English text for a key — voice commands also accept English words. */
  tEn: (key: TKey) => string;
  setLang: (code: LangCode) => void;
  /** Numbers in the user's locale (e.g. 1,23,456 Indian grouping). */
  formatNumber: (n: number, digits?: number) => string;
}

const I18nContext = createContext<I18nState | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);
  const [dict, setDict] = useState<Dict>(en);

  // First visit: saved choice → browser language → English.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage blocked → just use the browser guess */
    }
    setLangState(isLangCode(saved) ? saved : guessLangFromBrowser(navigator.languages ?? [navigator.language]));
  }, []);

  // Whenever the language changes: load its strings and update <html>.
  useEffect(() => {
    let cancelled = false; // ignore a slow load if the user already picked another language
    loadDict(lang)
      .then((d) => !cancelled && setDict(d))
      .catch(() => !cancelled && setDict(en)); // missing chunk (offline) → English, never blank
    const info = LANGUAGE_BY_CODE[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = info.dir;
    // Ol Chiki (Santali) is missing from most phones/PCs → fetch the Noto font only
    // when Santali is actually chosen. Other Indian scripts use the system fonts.
    if (lang === 'sat' && !document.getElementById('font-olck')) {
      const link = document.createElement('link');
      link.id = 'font-olck';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Ol+Chiki&display=swap';
      document.head.appendChild(link);
    }
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const setLang = useCallback((code: LangCode) => {
    setLangState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* not remembered, but still switched for this visit */
    }
  }, []);

  const value = useMemo<I18nState>(() => {
    const info = LANGUAGE_BY_CODE[lang];
    const numberFmt = (digits: number) => {
      try {
        // numberingSystem 'latn' = 0-9 everywhere ("international form of Indian numerals",
        // Article 343). Mixing ٣٣ and 30 on one medical screen caused confusion in testing.
        return new Intl.NumberFormat(`${lang}-IN`, { maximumFractionDigits: digits, numberingSystem: 'latn' });
      } catch {
        return new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }); // engine lacks this locale
      }
    };
    return {
      lang,
      info,
      t: (key, vars) => fill(dict[key] ?? en[key] ?? key, vars),
      tEn: (key) => en[key] ?? key,
      setLang,
      formatNumber: (n, digits = 1) => numberFmt(digits).format(n),
    };
  }, [lang, dict, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
