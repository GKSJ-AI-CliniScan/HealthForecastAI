import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],

  theme: {
    extend: {
      colors: {
        clinical: {
          50: "#effaff",
          100: "#d9f5ff",
          500: "#0ea5b7",
          600: "#087f92",
          700: "#075f70",
        },

        navy: {
          950: "#07172b",
          900: "#0b2442",
          800: "#12395f",
        },

        risk: {
          low: "#16805d",
          medium: "#b7791f",
          high: "#c2413b",
        },
      },

      boxShadow: {
        card:
          "0 1px 2px rgba(15, 23, 42, 0.03), 0 8px 24px rgba(15, 23, 42, 0.04)",
      },
    },
  },

  plugins: [forms],
};

export default config;