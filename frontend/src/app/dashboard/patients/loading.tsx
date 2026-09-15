import { SkeletonScreen, SkeletonTable } from '@/components/ui';

/** Mirrors the patient list: a single searchable table. */
export default function PatientsLoading() {
  return (
    <SkeletonScreen label="Loading patients">
      <SkeletonTable rows={8} columns={6} />
    </SkeletonScreen>
  );
}
