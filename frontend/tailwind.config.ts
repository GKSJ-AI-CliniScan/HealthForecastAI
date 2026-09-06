import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        warm: {
          bg: '#FFF9F5',
          card: '#FFFFFF',
          neutral: '#F3E8E1',
          'neutral-hover': '#EBE0D8',
          text: '#2F2926',
          'text-muted': '#6B625E',
          'text-light': '#9B908A',
          border: '#EADDD5',
          'border-subtle': '#F2E8E2',
        },
        brand: {
          50: '#FDF7F4',
          100: '#FBECE6',
          200: '#F6D9CC',
          300: '#E8A87C',
          400: '#DA8560',
          500: '#C96B4B',
          600: '#B85A3C',
          700: '#9B452B',
          800: '#7F3621',
          900: '#522013',
          950: '#34130A',
        },
        risk: {
          low: '#7C9A82',
          medium: '#D9A441',
          high: '#C85C5C',
        },
        sage: {
          50: '#F4F7F5',
          100: '#E5EDE7',
          200: '#C8DACD',
          500: '#7C9A82',
          600: '#67846D',
          700: '#516B56',
          900: '#2A3C2E',
        },
        amber: {
          50: '#FDF9F0',
          100: '#F9F1DC',
          200: '#F2DFAF',
          500: '#D9A441',
          600: '#C28E2C',
          700: '#9E711D',
          900: '#5A3E0C',
        },
        coral: {
          50: '#FCF5F5',
          100: '#F8E7E7',
          200: '#F0C7C7',
          500: '#C85C5C',
          600: '#B24747',
          700: '#933535',
          900: '#521919',
        },
      },
    },
  },
  plugins: [],
};

export default config;
