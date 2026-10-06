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
import { useI18n } from '@/i18n/I18nProvider';
import { LANGUAGES, isLangCode } from '@/i18n/languages';

export function LanguagePicker({ id = 'lang-picker' }: { id?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-lg font-semibold">
        <span aria-hidden="true">🌐 </span>
        <span className="sr-only sm:not-sr-only">{t('a11y.language')}</span>
      </label>
      <select
        id={id}
        value={lang}
        onChange={(e) => isLangCode(e.target.value) && setLang(e.target.value)}
        className="min-h-[48px] rounded-xl border-2 border-line bg-paper-raised px-3 text-lg"
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
