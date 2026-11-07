import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getStudentProfile } from "@/lib/api/eleve";
import { AvailabilityGrid } from "./availability-grid";
import { DAYS, PERIODS, cellsOf } from "./periods";

/** The weekly grid with the student's recorded availabilities. Render inside a <Card> and <Suspense>. */
export async function AvailabilitySection() {
  const { availabilities } = await getStudentProfile();
  return <AvailabilityGrid saved={cellsOf(availabilities)} />;
}

/** Same footprint as the grid: header, 6 rows of 3 cells and the footer. */
export function AvailabilitySectionSkeleton() {
  return (
    <div>
      <LoadingLabel>Chargement de vos disponibilités…</LoadingLabel>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2 pt-0.5">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-6 w-60 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-6 w-44 rounded-full sm:mt-1" />
      </div>
      <div className="mt-4 px-2 pb-2 sm:px-4">
        <div className="grid grid-cols-[28%_1fr_1fr_1fr] items-center border-b border-line py-3 sm:grid-cols-[34%_1fr_1fr_1fr]">
          <Skeleton className="mx-2 h-4 w-10 sm:mx-3" />
          {PERIODS.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
        {DAYS.map((day) => (
          <div
            key={day}
            className="grid h-[3.75rem] grid-cols-[28%_1fr_1fr_1fr] items-center border-b border-line last:border-b-0 sm:h-16 sm:grid-cols-[34%_1fr_1fr_1fr]"
          >
            <div className="space-y-1.5 px-2 sm:px-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            {PERIODS.map((p) => (
              <Skeleton key={p.id} className="mx-auto size-8 rounded-[10px]" />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl sm:w-72" />
      </div>
    </div>
  );
}
