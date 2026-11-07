import Link from "next/link";
import { ArrowRight, CalendarOff } from "lucide-react";
import { CardBody } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { cellsOf, periodsByDay, slotCount } from "@/features/disponibilites/periods";
import { getPageProfile } from "./data";

function EditLink() {
  return (
    <Link
      href="/eleve/disponibilites"
      className="-mx-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft"
    >
      Modifier mes disponibilités
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

/**
 * Summary of the weekly availabilities ("Lundi : soir"), edited on /eleve/disponibilites.
 * Render inside a <Card> and <Suspense>.
 */
export async function Availabilities() {
  const { availabilities } = await getPageProfile();
  const cells = cellsOf(availabilities);
  const days = periodsByDay(cells);

  if (days.length === 0) {
    return (
      <CardBody className="space-y-2">
        <p className="flex items-start gap-2 text-sm text-ink-muted">
          <CalendarOff className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
          Aucune disponibilité enregistrée. Indiquez vos créneaux préférés pour faciliter la planification.
        </p>
        <EditLink />
      </CardBody>
    );
  }

  return (
    <CardBody className="space-y-3">
      <p className="text-sm font-semibold text-ink-muted">
        {slotCount(cells.length)} par semaine
      </p>
      <dl className="divide-y divide-line">
        {days.map(({ day, periods }) => (
          <div key={day} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <dt className="font-semibold text-ink">{day}</dt>
            <dd className="text-right text-ink-muted">{periods.map((p) => p.label).join(", ")}</dd>
          </div>
        ))}
      </dl>
      <EditLink />
    </CardBody>
  );
}

export function AvailabilitiesSkeleton() {
  return (
    <CardBody className="space-y-3">
      <LoadingLabel>Chargement de vos disponibilités…</LoadingLabel>
      <Skeleton className="h-5 w-40" />
      <div className="divide-y divide-line">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-52" />
    </CardBody>
  );
}
