import type { ReactNode } from 'react';

import TabNav from '@/components/layout/TabNav';
import { NoAccess } from '@/components/ui/states';
import { analyticsTabs } from '@/lib/navigation';
import { requireUser } from '@/lib/session';

/** Healthcare Analytics Dashboard shell (Module 6). Tabs follow the caller's permissions. */
export default async function AnalyticsLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const tabs = analyticsTabs(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Healthcare analytics</h1>
        <p className="mt-1 text-sm opacity-70">
          Aggregated, hospital-wide figures. No individual patient record is shown here.
        </p>
      </div>
      {tabs.length === 0 ? (
        <NoAccess what="healthcare analytics" />
      ) : (
        <>
          <TabNav tabs={tabs} label="Analytics sections" />
          {children}
        </>
      )}
    </div>
  );
}
