import { SkeletonScreen, SkeletonTable, SkeletonTile } from '@/components/ui';

/** Mirrors the risk dashboard: three tiles above the cohort table. */
export default function RiskLoading() {
  return (
    <SkeletonScreen label="Loading risk data">
      <div className="grid gap-4 sm:grid-cols-3">
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
      </div>
      <SkeletonTable rows={5} columns={6} />
    </SkeletonScreen>
  );
}
