import { SkeletonCard, SkeletonScreen, SkeletonTable, SkeletonTile } from '@/components/ui';

/** Mirrors patient detail: risk summary, tiles, demographics, then history. */
export default function PatientDetailLoading() {
  return (
    <SkeletonScreen label="Loading the patient record">
      <SkeletonCard lines={2} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
      </div>
      <SkeletonCard lines={4} />
      <SkeletonTable rows={5} columns={6} />
    </SkeletonScreen>
  );
}
