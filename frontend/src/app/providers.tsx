'use client';
/**
 * providers.tsx — wraps the app in its three global "brains", in this order:
 *   SessionProvider  who is signed in            (lib/session.tsx)
 *   I18nProvider     which language              (i18n/I18nProvider.tsx)
 *   A11yProvider     voice + accessibility       (a11y/A11yProvider.tsx) — needs both above
 * WHY A SEPARATE FILE: layout.tsx stays a server component (for metadata), and
 * client-side context lives here. FLOWS NEXT: layout.tsx renders <Providers>.
 */
import type { ReactNode } from 'react';

import { A11yProvider } from '@/a11y/A11yProvider';
import { I18nProvider } from '@/i18n/I18nProvider';
import { SessionProvider } from '@/lib/session';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <A11yProvider>{children}</A11yProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
