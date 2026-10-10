/**
 * languages.ts — the single list of every language the app can show.
 *
 * WHY: The brief asks for all 22 languages of the Eighth Schedule of the
 * Constitution of India, plus English. Keeping them in ONE typed list means the
 * language picker, the <html lang/dir> switch, the read-aloud voice and the
 * voice-command recogniser all read the same facts and can never disagree.
 *
 * FLOWS NEXT: I18nProvider.tsx imports LANGUAGES to load the right locale file
 * and set <html lang/dir>; a11y/speech.ts uses `speech` + `speechFallback` to
 * pick a voice; LanguagePicker.tsx renders the list.
 */

/** Short code used for the locale file name, e.g. locales/hi.json. */
export type LangCode =
  | 'en'
  | 'as'
  | 'bn'
  | 'brx'
  | 'doi'
  | 'gu'
  | 'hi'
  | 'kn'
  | 'ks'
  | 'kok'
  | 'mai'
  | 'ml'
  | 'mni'
  | 'mr'
  | 'ne'
  | 'or'
  | 'pa'
  | 'sa'
  | 'sat'
  | 'sd'
  | 'ta'
  | 'te'
  | 'ur';

/**
 * How much a translation has been checked. All 22 were written by an AI and
 * need a native speaker's review before real hospital use; `needs_review`
 * marks the ones with the least confidence (low-resource languages/scripts).
 * The UI never shows this — it is for the team and the README.
 */
export type ReviewStatus = 'source' | 'draft' | 'needs_review';

export interface LanguageInfo {
  code: LangCode;
  /** Name in English — used for screen-reader hints and docs. */
  english: string;
  /** Name in its own script — what the user actually recognises in the picker. */
  native: string;
  /** Text direction. Urdu, Kashmiri and Sindhi are written right-to-left. */
  dir: 'ltr' | 'rtl';
  /** BCP-47 tag given to the browser's speech engine (read-aloud + voice commands). */
  speech: string;
  /**
   * If the device has no voice for `speech`, try this one instead. Chosen by
   * SCRIPT, not by language: a Hindi voice can pronounce Devanagari text from
   * Maithili/Dogri/Konkani/Sanskrit/Bodo understandably; an Urdu voice can read
   * Perso-Arabic Kashmiri/Sindhi; a Bengali voice can read Assamese/Manipuri
   * written in Bengali script. Santali (Ol Chiki) has no sensible fallback.
   */
  speechFallback?: string;
  review: ReviewStatus;
}

/**
 * Order: English first (default), then alphabetical by English name so the
 * list is predictable for people who navigate it with a screen reader.
 */
export const LANGUAGES: readonly LanguageInfo[] = [
  { code: 'en', english: 'English', native: 'English', dir: 'ltr', speech: 'en-IN', review: 'source' },
  { code: 'as', english: 'Assamese', native: 'অসমীয়া', dir: 'ltr', speech: 'as-IN', speechFallback: 'bn-IN', review: 'draft' },
  { code: 'bn', english: 'Bengali', native: 'বাংলা', dir: 'ltr', speech: 'bn-IN', review: 'draft' },
  { code: 'brx', english: 'Bodo', native: 'बड़ो', dir: 'ltr', speech: 'brx-IN', speechFallback: 'hi-IN', review: 'needs_review' },
  { code: 'doi', english: 'Dogri', native: 'डोगरी', dir: 'ltr', speech: 'doi-IN', speechFallback: 'hi-IN', review: 'needs_review' },
  { code: 'gu', english: 'Gujarati', native: 'ગુજરાતી', dir: 'ltr', speech: 'gu-IN', review: 'draft' },
  { code: 'hi', english: 'Hindi', native: 'हिन्दी', dir: 'ltr', speech: 'hi-IN', review: 'draft' },
  { code: 'kn', english: 'Kannada', native: 'ಕನ್ನಡ', dir: 'ltr', speech: 'kn-IN', review: 'draft' },
  { code: 'ks', english: 'Kashmiri', native: 'کٲشُر', dir: 'rtl', speech: 'ks-IN', speechFallback: 'ur-IN', review: 'needs_review' },
  { code: 'kok', english: 'Konkani', native: 'कोंकणी', dir: 'ltr', speech: 'kok-IN', speechFallback: 'mr-IN', review: 'needs_review' },
  { code: 'mai', english: 'Maithili', native: 'मैथिली', dir: 'ltr', speech: 'mai-IN', speechFallback: 'hi-IN', review: 'needs_review' },
  { code: 'ml', english: 'Malayalam', native: 'മലയാളം', dir: 'ltr', speech: 'ml-IN', review: 'draft' },
  { code: 'mni', english: 'Manipuri (Meitei)', native: 'মৈতৈলোন্', dir: 'ltr', speech: 'mni-IN', speechFallback: 'bn-IN', review: 'needs_review' },
  { code: 'mr', english: 'Marathi', native: 'मराठी', dir: 'ltr', speech: 'mr-IN', review: 'draft' },
  { code: 'ne', english: 'Nepali', native: 'नेपाली', dir: 'ltr', speech: 'ne-NP', speechFallback: 'hi-IN', review: 'draft' },
  { code: 'or', english: 'Odia', native: 'ଓଡ଼ିଆ', dir: 'ltr', speech: 'or-IN', review: 'draft' },
  { code: 'pa', english: 'Punjabi', native: 'ਪੰਜਾਬੀ', dir: 'ltr', speech: 'pa-IN', review: 'draft' },
  { code: 'sa', english: 'Sanskrit', native: 'संस्कृतम्', dir: 'ltr', speech: 'sa-IN', speechFallback: 'hi-IN', review: 'needs_review' },
  { code: 'sat', english: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ', dir: 'ltr', speech: 'sat-IN', review: 'needs_review' },
  { code: 'sd', english: 'Sindhi', native: 'سنڌي', dir: 'rtl', speech: 'sd-IN', speechFallback: 'ur-IN', review: 'needs_review' },
  { code: 'ta', english: 'Tamil', native: 'தமிழ்', dir: 'ltr', speech: 'ta-IN', review: 'draft' },
  { code: 'te', english: 'Telugu', native: 'తెలుగు', dir: 'ltr', speech: 'te-IN', review: 'draft' },
  { code: 'ur', english: 'Urdu', native: 'اردو', dir: 'rtl', speech: 'ur-IN', review: 'draft' },
] as const;

/** Fast lookup by code; used every time the language changes. */
export const LANGUAGE_BY_CODE: Record<LangCode, LanguageInfo> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l]),
) as Record<LangCode, LanguageInfo>;

export const DEFAULT_LANG: LangCode = 'en';

/** Type guard — protects us from a stale or edited value in browser storage. */
export function isLangCode(value: unknown): value is LangCode {
  return typeof value === 'string' && value in LANGUAGE_BY_CODE;
}

/**
 * Best first guess from the browser (e.g. navigator.language = "ta-IN" → "ta").
 * Only used the very first time; after that the user's choice is remembered.
 */
export function guessLangFromBrowser(navigatorLanguages: readonly string[]): LangCode {
  for (const tag of navigatorLanguages) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLangCode(base)) return base;
  }
  return DEFAULT_LANG;
}
