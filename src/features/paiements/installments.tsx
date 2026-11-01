import { CalendarCheck } from "lucide-react";
import { CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getInstallments } from "@/lib/api/eleve";
import { InstallmentsPanel } from "./installments-panel";

/** Render inside a flex-column <Card> and <Suspense>. */
export async function Installments() {
  const installments = await getInstallments();
  if (installments.length === 0) {
    return (
      <CardBody>
        <EmptyState
          icon={CalendarCheck}
          title="Pas d'échéancier"
          description="Vous réglez vos heures au fur et à mesure, sans paiement programmé."
          className="py-6"
        />
      </CardBody>
    );
  }
  return <InstallmentsPanel installments={installments} />;
}

export function InstallmentsSkeleton() {
  return (
    <CardBody className="flex flex-col gap-5">
      <LoadingLabel>Chargement de votre échéancier…</LoadingLabel>
      <Skeleton className="h-4 w-40" />
      <div className="space-y-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-44" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </CardBody>
  );
}
