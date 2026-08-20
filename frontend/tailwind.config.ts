import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        risk: {
          low: '#0f9d58',
          medium: '#f4b400',
          high: '#d93025',
        },
      },
    },
  },
  plugins: [],
};

export default config;
