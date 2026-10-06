/**
 * i18n.test.mjs — guards the 23 language files (runs in CI via `npm test`).
 * Fails if any language is missing a key, has an extra key, an empty string,
 * or lost/changed a {placeholder} — the bugs that silently show blank buttons
 * or "patients found" without the number.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../src/i18n/locales/', import.meta.url);
const load = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
const en = load('en.json');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const ph = (s) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort().join(',');

test('there are 23 locale files (English + 22 scheduled languages)', () => {
  assert.equal(files.length, 23);
});

for (const f of files) {
  test(`${f}: same keys as en.json, non-empty, placeholders intact`, () => {
    const d = load(f);
    assert.deepEqual(Object.keys(d).sort(), Object.keys(en).sort());
    for (const [k, v] of Object.entries(d)) {
      assert.ok(typeof v === 'string' && v.trim(), `${f} ${k} is empty`);
      assert.equal(ph(v), ph(en[k]), `${f} ${k} placeholders`);
    }
  });
}

test('every locale file is listed in languages.ts (and nothing extra)', () => {
  const src = readFileSync(new URL('../src/i18n/languages.ts', import.meta.url), 'utf8');
  const codes = [...src.matchAll(/\{ code: '([a-z]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(codes, files.map((f) => f.replace('.json', '')).sort());
});

test('every t(\'key\') used in the source exists in en.json', () => {
  const walk = (u) =>
    readdirSync(u, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(new URL(`${e.name}/`, u)) : /\.tsx?$/.test(e.name) ? [new URL(e.name, u)] : [],
    );
  const missing = [];
  for (const file of walk(new URL('../src/', import.meta.url))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) if (!(m[1] in en)) missing.push(`${file.pathname}: ${m[1]}`);
  }
  assert.deepEqual(missing, []);
});
