'use client';
/**
 * LanguagePicker.tsx — choose one of the 23 languages.
 *
 * WHY A PLAIN <select>: it is the control every screen reader and every phone
 * already knows (Android/iOS open their own big native list). Each option shows
 * the language in its OWN script ("தமிழ்") so a user who cannot read English
 * still finds it; `lang` on each option makes screen readers pronounce it right.
 * FLOWS NEXT: setLang() in I18nProvider → whole app re-renders in that language.
 */
import { Languages } from 'lucide-react';

import { useI18n } from '@/i18n/I18nProvider';
import { LANGUAGES, isLangCode } from '@/i18n/languages';

export function LanguagePicker({ id = 'lang-picker', compact = false }: { id?: string; compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
        <Languages aria-hidden="true" size={18} />
        {/* compact = label visible to screen readers only (top bar); full = visible label (Help page) */}
        <span className={compact ? 'sr-only' : ''}>{t('a11y.language')}</span>
      </label>
      <select
        id={id}
        value={lang}
        onChange={(e) => isLangCode(e.target.value) && setLang(e.target.value)}
        className={`min-h-[44px] rounded-xl border border-line bg-paper-raised px-3 text-base text-ink ${compact ? 'max-w-[6.5rem] sm:max-w-none' : ''}`}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.native === l.english ? l.native : `${l.native} — ${l.english}`}
          </option>
        ))}
      </select>
    </div>
  );
}
