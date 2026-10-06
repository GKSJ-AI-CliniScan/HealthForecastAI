/**
 * voiceCommands.ts — turns what the browser HEARD into what to DO.
 *
 * WHY THIS DESIGN: we do not write per-language command grammars for 23
 * languages. The command words are simply the menu labels and button labels
 * that are ALREADY translated (nav.*, a11y.read, auth.logout…). So a Tamil
 * user says the Tamil menu name they can hear/see, and it just works. English
 * labels are always accepted too, because many people mix languages.
 *
 * Matching is forgiving: speech recognition rarely returns the exact label,
 * so we score word overlap and accept the best match above a threshold.
 * Pure function → tests/voice.test.mjs.
 * FLOWS NEXT: A11yProvider.listen() calls matchCommand() with the transcript.
 */

export interface VoiceCommand {
  /** what to do if matched, e.g. 'go:/patients' or 'read' */
  action: string;
  /** every phrase that should trigger it (current language + English) */
  phrases: string[];
}

/**
 * Lower-case, drop punctuation, keep letters of ANY script (\p{L}) and their
 * combining marks (\p{M} — Indic vowel signs live here), plus digits.
 */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 0..1 — how well `heard` matches `phrase`. */
export function score(heard: string, phrase: string): number {
  const h = normalize(heard);
  const p = normalize(phrase);
  if (!h || !p) return 0;
  if (h === p) return 1;
  // Whole phrase spoken inside a longer sentence ("please open patients").
  if (h.includes(p)) return 0.95;
  // Fraction of the phrase's words that were heard.
  const pw = p.split(' ');
  const hw = new Set(h.split(' '));
  const hits = pw.filter((w) => hw.has(w)).length;
  return hits / pw.length;
}

/** Best command for what was heard, or null if nothing is a convincing match. */
export function matchCommand(heard: string, commands: VoiceCommand[], threshold = 0.6): string | null {
  let best: { action: string; s: number } | null = null;
  for (const c of commands) {
    for (const phrase of c.phrases) {
      const s = score(heard, phrase);
      if (s >= threshold && (!best || s > best.s)) best = { action: c.action, s };
    }
  }
  return best?.action ?? null;
}
