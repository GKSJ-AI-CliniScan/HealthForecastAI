import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, 'globals.css'), 'utf8');

/** The `--c-*` declarations (and color-scheme) inside the block that opens with `selector`. */
function declarations(selector: string): string[] {
  const start = css.indexOf(selector);
  expect(start, `${selector} block exists`).toBeGreaterThan(-1);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return body
    .split(';')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter((line) => line.startsWith('--c-') || line.startsWith('color-scheme'));
}

describe('colour themes', () => {
  const light = declarations(':root {');
  const explicitDark = declarations(":root[data-theme='dark']");
  const systemDark = declarations(":root:not([data-theme='light'])");

  it('gives the explicit dark theme and the system dark theme identical colours', () => {
    expect(explicitDark.length).toBeGreaterThan(20);
    expect(systemDark).toEqual(explicitDark);
  });

  it('defines every colour token in both themes', () => {
    const names = (list: string[]) => list.filter((l) => l.startsWith('--c-')).map((l) => l.split(':')[0]);
    expect(names(explicitDark)).toEqual(names(light));
  });

  it('declares the browser colour scheme for each theme', () => {
    expect(light).toContain('color-scheme: light');
    expect(explicitDark).toContain('color-scheme: dark');
  });
});
