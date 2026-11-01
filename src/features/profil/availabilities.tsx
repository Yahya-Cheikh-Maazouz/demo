import { CalendarOff } from "lucide-react";
import { CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import type { Availability } from "@/lib/types";
import { getPageProfile } from "./data";

function AvailabilityRows({ availabilities }: { availabilities: Availability[] }) {
  return (
    <dl className="divide-y divide-line">
      {availabilities.map(({ day, from, to }) => (
        <div key={`${day}-${from}`} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="font-semibold text-ink">{day}</dt>
          <dd className="text-ink-muted tabular-nums">
            {from} – {to}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Weekly availabilities recorded by the school. Render inside a <Card> and <Suspense>. */
export async function Availabilities() {
  const { availabilities } = await getPageProfile();
  if (availabilities.length === 0) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="Aucune disponibilité enregistrée"
        description="Indiquez vos créneaux à votre auto-école pour faciliter la planification."
      />
    );
  }
  return (
    <CardBody>
      <AvailabilityRows availabilities={availabilities} />
    </CardBody>
  );
}

export function AvailabilitiesSkeleton() {
  return (
    <CardBody>
      <LoadingLabel>Chargement de vos disponibilités…</LoadingLabel>
      <div className="divide-y divide-line">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </CardBody>
  );
}
