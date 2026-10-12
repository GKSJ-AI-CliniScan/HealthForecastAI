import type { Metadata } from 'next';
import { Atkinson_Hyperlegible_Next } from 'next/font/google';
import './globals.css';

/*
 * Atkinson Hyperlegible Next (Braille Institute) - drawn for low-vision
 * legibility, with distinct 0/O and 1/l/I, which matters for scores and record
 * numbers. next/font downloads it at build time and serves it from this app's
 * own origin, so the browser never requests fonts.googleapis.com at runtime.
 */
const sans = Atkinson_Hyperlegible_Next({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-sans',
  // Next has no fallback metrics for this (2025) family and warns on every
  // compile; the system fallback in globals.css is used while it loads.
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: 'HealthForecast AI',
  description:
    'Hospital readmission prediction and patient risk intelligence for clinical teams.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
