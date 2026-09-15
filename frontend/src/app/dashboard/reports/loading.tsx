import { SkeletonCard, SkeletonScreen, SkeletonTable, SkeletonTile } from '@/components/ui';

/** Mirrors the forecast report: summary tiles, paired cards, then the cohort. */
export default function ReportsLoading() {
  return (
    <SkeletonScreen label="Generating the forecast report">
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
      <SkeletonCard lines={3} />
      <SkeletonTable rows={4} columns={5} />
    </SkeletonScreen>
  );
}
