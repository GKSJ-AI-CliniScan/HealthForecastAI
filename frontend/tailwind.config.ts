import type { Config } from 'tailwindcss';

/** Map a design token (an "R G B" triplet in globals.css) to a Tailwind colour. */
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        sunken: token('sunken'),
        ink: { DEFAULT: token('ink'), muted: token('ink-muted') },
        rule: { DEFAULT: token('rule'), strong: token('rule-strong') },
        brand: {
          DEFAULT: token('brand'),
          strong: token('brand-strong'),
          tint: token('brand-tint'),
          deep: token('brand-deep'),
        },
        'on-brand': token('on-brand'),
        danger: { DEFAULT: token('danger'), tint: token('danger-tint') },
        // The three score bands. Reserved for LOW / MEDIUM / HIGH only.
        zone: {
          low: token('low'),
          'low-tint': token('low-tint'),
          'low-fill': token('low-fill'),
          medium: token('medium'),
          'medium-tint': token('medium-tint'),
          'medium-fill': token('medium-fill'),
          high: token('high'),
          'high-tint': token('high-tint'),
          'high-fill': token('high-fill'),
        },
        // Kept for compatibility with existing references.
        risk: {
          low: token('low'),
          medium: token('medium'),
          high: token('high'),
        },
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        title: ['1.625rem', { lineHeight: '2rem', letterSpacing: '-0.012em', fontWeight: '700' }],
        section: ['1.125rem', { lineHeight: '1.625rem', fontWeight: '650' }],
        panel: ['0.9375rem', { lineHeight: '1.375rem', fontWeight: '650' }],
        metric: ['1.875rem', { lineHeight: '2.125rem', letterSpacing: '-0.01em', fontWeight: '700' }],
      },
      maxWidth: {
        content: '75rem',
      },
    },
  },
  plugins: [],
};

export default config;
