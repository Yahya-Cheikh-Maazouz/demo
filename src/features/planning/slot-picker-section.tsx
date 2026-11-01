import { Card } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getAvailableSlots } from "@/lib/api/eleve";
import { getPlanningBalance } from "./data";
import { SlotPicker } from "./slot-picker";

/** Render inside <Suspense>. */
export async function SlotPickerSection() {
  const [{ now, rules, referent, slots }, balance] = await Promise.all([getAvailableSlots(), getPlanningBalance()]);
  return (
    <SlotPicker
      now={now}
      slots={slots}
      referent={referent}
      restrictedToReferent={rules.restrictedToReferent}
      hoursAfterReservations={balance.afterReservationsHours}
    />
  );
}

export function SlotPickerSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingLabel>Chargement des créneaux libres…</LoadingLabel>
      <div>
        <Skeleton className="mb-2 h-4 w-20" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-11 w-20 rounded-full" />
          <Skeleton className="h-11 w-52 rounded-full" />
          <Skeleton className="h-11 w-36 rounded-full" />
        </div>
      </div>
      <div>
        <Skeleton className="mb-2 h-4 w-60 max-w-full" />
        <div className="-mx-4 flex gap-2 overflow-hidden px-4 pt-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0">
          {Array.from({ length: 14 }, (_, index) => (
            <Skeleton key={index} className="h-21.5 w-18 shrink-0 rounded-2xl sm:w-auto" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="mb-3 h-7 w-52" />
        <Card className="overflow-hidden">
          <Skeleton className="h-7 w-full rounded-none" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3 border-t border-line px-4 py-4 sm:gap-4 sm:px-5">
              <div className="w-19 shrink-0 space-y-1.5 sm:w-21">
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40 max-w-full" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
              <Skeleton className="hidden h-10 w-24 rounded-lg sm:block" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
