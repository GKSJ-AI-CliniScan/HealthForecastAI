/**
 * layout.tsx — the HTML skeleton shared by every page (server component).
 * <html lang/dir> start as English/LTR; I18nProvider switches them on the client.
 * FLOWS NEXT: <Providers> (providers.tsx) → each page.
 */
import type { Metadata, Viewport } from 'next';
import './globals.css';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'HealthForecast AI', template: '%s · HealthForecast AI' },
  description:
    'Simple hospital readmission risk tool in 23 Indian languages, with read-aloud and voice commands for blind and low-vision users.',
  // Patient-facing hospital tool: must never be indexed by search engines (also see robots.ts).
  robots: { index: false, follow: false },
  openGraph: {
    title: 'HealthForecast AI',
    description: 'Readmission risk, care advice and hospital reports — simple, multilingual, accessible.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1, // no maximum-scale: users MUST be able to pinch-zoom (WCAG 1.4.4)
  themeColor: '#0B5D6B',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
