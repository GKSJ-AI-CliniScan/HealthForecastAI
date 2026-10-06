/**
 * speech.ts — thin, safe wrappers around the browser's Web Speech API.
 *
 * WHY THE BROWSER API (and not a cloud TTS): free, works offline on most
 * Android phones (Google TTS voices are on-device), sends no patient text to a
 * third party, and needs no API key in the frontend (no secrets in frontend).
 *
 * Two parts:
 *   speak()         text-to-speech, used by "Read aloud", talking buttons, page titles
 *   startListening() speech-to-text, used by "Speak a command" (Chrome/Edge only)
 * FLOWS NEXT: A11yProvider.tsx is the only caller; it adds settings (speed) and UI.
 */
import type { LanguageInfo } from '@/i18n/languages';

/** Is text-to-speech available at all in this browser? */
export const canSpeak = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Chrome loads voices asynchronously: the first getVoices() call is often [].
 * Wait (max 1.5 s) for the 'voiceschanged' event before deciding "no voice".
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const now = window.speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

/** Finds a voice for "ta-IN" → any "ta-*" → null. */
function findVoice(voices: SpeechSynthesisVoice[], tag: string): SpeechSynthesisVoice | null {
  const lower = tag.toLowerCase();
  const base = lower.split('-')[0];
  return (
    voices.find((v) => v.lang.toLowerCase().replace('_', '-') === lower) ??
    voices.find((v) => v.lang.toLowerCase().split(/[-_]/)[0] === base) ??
    null
  );
}

export type SpeakResult = 'spoken' | 'fallback_voice' | 'no_voice' | 'unsupported';

/**
 * Speaks `text`. Picks the language's own voice, else the same-SCRIPT fallback
 * from languages.ts (e.g. Maithili text read by a Hindi voice), else reports
 * 'no_voice' so the UI can tell the user how to install one. We never read
 * Tamil text with an English voice — that would be meaningless noise.
 */
export async function speak(text: string, lang: LanguageInfo, rate = 1): Promise<SpeakResult> {
  if (!canSpeak()) return 'unsupported';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'spoken';
  const voices = await loadVoices();
  let voice = findVoice(voices, lang.speech);
  let result: SpeakResult = 'spoken';
  if (!voice && lang.speechFallback) {
    voice = findVoice(voices, lang.speechFallback);
    result = 'fallback_voice';
  }
  if (!voice && lang.code !== 'en') return 'no_voice';

  window.speechSynthesis.cancel(); // stop anything still talking so voices never overlap
  // Long pages: some engines stop after ~15 s of one utterance, so speak in sentence chunks.
  const chunks = clean.match(/[^.!?।॥۔᱾\n]+[.!?।॥۔᱾]?/g) ?? [clean];
  for (const chunk of chunks) {
    const u = new SpeechSynthesisUtterance(chunk.trim());
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? lang.speech;
    u.rate = rate;
    window.speechSynthesis.speak(u); // queued, plays one after another
  }
  return result;
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

// ---------------------------------------------------------------- listening
/** Minimal typing for the (still prefixed) SpeechRecognition API. */
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canListen = (): boolean => recognitionCtor() !== null;

/**
 * Listens once and resolves with up to 3 guesses of what was said
 * (alternatives improve matching for accented speech). Resolves [] on silence.
 */
export function listenOnce(lang: LanguageInfo): { result: Promise<string[]>; cancel: () => void } {
  const Ctor = recognitionCtor();
  if (!Ctor) return { result: Promise.resolve([]), cancel: () => undefined };
  const rec = new Ctor();
  rec.lang = lang.speech;
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  const result = new Promise<string[]>((resolve) => {
    let heard: string[] = [];
    rec.onresult = (e) => {
      const first = e.results[0];
      heard = Array.from({ length: first.length }, (_, i) => first[i].transcript);
    };
    rec.onerror = () => resolve([]); // no-speech, not-allowed (mic denied), network…
    rec.onend = () => resolve(heard);
  });
  rec.start();
  return { result, cancel: () => rec.abort() };
}
