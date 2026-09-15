import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Mapped onto the CSS variables in globals.css so the same risk
        // palette works in light and dark mode. The token names are unchanged.
        risk: {
          low: 'var(--risk-low)',
          medium: 'var(--risk-medium)',
          high: 'var(--risk-high)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
