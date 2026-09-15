import { SkeletonCard, SkeletonScreen, SkeletonTable, SkeletonTile } from '@/components/ui';

/** Mirrors the overview layout: four tiles, two cards, then a table. */
export default function DashboardLoading() {
  return (
    <SkeletonScreen label="Loading the clinical overview">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
      <SkeletonTable rows={4} columns={5} />
    </SkeletonScreen>
  );
}
