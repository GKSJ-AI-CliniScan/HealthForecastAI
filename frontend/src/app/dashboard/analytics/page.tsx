import { redirect } from 'next/navigation';

import { analyticsTabs } from '@/lib/navigation';
import { requireUser } from '@/lib/session';

/** Open the first analytics tab the caller may see. */
export default async function AnalyticsIndexPage() {
  const user = await requireUser();
  const [first] = analyticsTabs(user);
  if (first) {
    redirect(first.href);
  }
  return null;
}
