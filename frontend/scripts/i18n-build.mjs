/**
 * i18n-build.mjs — turns the translator-friendly text files into app JSON.
 *
 * WHY THIS EXISTS: 22 languages × ~200 strings is too much to review inside
 * JSON. Translators (and native-speaker reviewers) work on plain text files in
 * i18n-source/, ONE string per line, where line N of hi.txt is the Hindi for
 * line N of en.txt. keys.txt holds the matching key for each line.
 * This script zips keys + lines into src/i18n/locales/<code>.json, which the
 * app actually loads.
 *
 * SAFETY CHECKS (the script stops with an error if any fail):
 *   1. every file has exactly as many lines as keys.txt
 *   2. no empty line (an empty string would show a blank button)
 *   3. the {placeholders} in each line match the English line exactly,
 *      otherwise "{n} patients" could silently lose its number.
 *
 * RUN:  npm run i18n:build      (FLOWS NEXT: commit the regenerated JSON;
 *                                 tests/i18n.test.mjs re-checks it in CI)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'i18n-source');
const outDir = join(root, 'src', 'i18n', 'locales');

// Read a text file as an array of lines, dropping only the final newline.
const readLines = (file) =>
  readFileSync(join(srcDir, file), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');

// "{n} days" -> ["{n}"]; sorted so the order inside a sentence may differ per language.
const placeholders = (text) => (text.match(/\{[a-zA-Z]+\}/g) ?? []).sort().join(',');

const keys = readLines('keys.txt');
const english = readLines('en.txt');
const problems = [];

for (const file of readdirSync(srcDir).filter((f) => f.endsWith('.txt') && f !== 'keys.txt')) {
  const code = file.replace(/\.txt$/, '');
  const lines = readLines(file);

  if (lines.length !== keys.length) {
    problems.push(`${file}: ${lines.length} lines, expected ${keys.length}`);
    continue; // line shift = every key after it is wrong, so skip writing this file
  }

  const out = {};
  lines.forEach((line, i) => {
    const text = line.trim();
    if (!text) problems.push(`${file}:${i + 1} (${keys[i]}) is empty`);
    if (placeholders(text) !== placeholders(english[i])) {
      problems.push(`${file}:${i + 1} (${keys[i]}) placeholders ${placeholders(text) || 'none'} ≠ ${placeholders(english[i]) || 'none'}`);
    }
    out[keys[i]] = text;
  });

  writeFileSync(join(outDir, `${code}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');
}

if (problems.length) {
  console.error(`i18n-build found ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.warn(`i18n-build: wrote ${readdirSync(srcDir).filter((f) => f.endsWith('.txt') && f !== 'keys.txt').length} locale files.`);
