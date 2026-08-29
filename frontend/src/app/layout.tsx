import type { Metadata } from 'next';
import './globals.css';

import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'HealthForecast AI',
  description:
    'Hospital readmission prediction and patient risk intelligence for clinical teams.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/*
          The session provider wraps the whole tree because both the login page
          and the dashboard read from it. Without it mounted here, any page
          calling useAuth fails during the production prerender pass.
        */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
