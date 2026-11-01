import { PackageOpen } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getHourPacks } from "@/lib/api/eleve";
import { PurchaseForm } from "./purchase-form";

/** Hour packs sold online by the school. Render inside <Suspense>. */
export async function Purchase() {
  const packs = await getHourPacks();
  if (packs.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="Pas d'achat en ligne pour le moment"
        description="Votre auto-école ne propose pas encore d'heures à l'achat en ligne. Adressez-vous à l'accueil."
        className="py-6"
      />
    );
  }
  return <PurchaseForm packs={packs} />;
}

export function PurchaseSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingLabel>Chargement des offres…</LoadingLabel>
      <div>
        <Skeleton className="h-4 w-36" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-3 rounded-2xl border border-line p-4 sm:flex-col">
              <Skeleton className="size-5 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="hidden h-4 w-16 sm:block" />
                <Skeleton className="h-6 w-16 sm:h-8" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="hidden h-4 w-2/3 sm:block" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-4 w-32" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-18 rounded-2xl" />
          <Skeleton className="h-18 rounded-2xl" />
        </div>
      </div>
      <Skeleton className="h-28 rounded-2xl sm:h-24" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}
