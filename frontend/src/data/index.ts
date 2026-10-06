/**
 * data/index.ts — the one import every screen uses: `import { data } from '@/data'`.
 *
 * WHY: screens never know whether they talk to the real backend or sample data.
 * Switching is one env var (NEXT_PUBLIC_DATA_MODE), never a code change.
 * FLOWS NEXT: pages call data.xxx() through the useData() hook (saral/useData.ts).
 */
import { DATA_MODE } from '@/config';
import { demoData } from './demo';
import { liveData } from './live';
import type { DataSource } from './types';

export const data: DataSource = DATA_MODE === 'demo' ? demoData : liveData;
export * from './types';
export { ApiError } from './http';
