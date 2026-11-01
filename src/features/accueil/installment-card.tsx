import { CalendarClock, CircleAlert, CircleCheck, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CardBody } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getInstallments } from "@/lib/api/eleve";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, formatHours } from "@/lib/format";
import type { Installment } from "@/lib/types";
import { TextLink } from "./home-section";

/** Render inside a <Card> and <Suspense>. */
export async function InstallmentCardBody() {
  return <InstallmentCardView installments={await getInstallments()} />;
}

/** Next unpaid installment of the payment plan; an overdue one is shown in danger with a pay button. */
export function InstallmentCardView({ installments }: { installments: Installment[] }) {
  const next = installments
    .filter((i) => i.status !== "payee")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];

  if (!next) {
    return (
      <CardBody>
        <p className="flex items-start gap-2 text-sm font-semibold text-success">
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Aucune échéance à venir : vos paiements sont à jour.
        </p>
      </CardBody>
    );
  }

  const late = next.status === "en_retard";

  return (
    <CardBody>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className={cn("text-3xl leading-tight font-bold tracking-tight tabular-nums", late ? "text-danger" : "text-ink")}>
          {formatCurrency(next.amount, { round: true })}
        </p>
        {late ? (
          <Badge tone="danger" icon={CircleAlert}>
            En retard
          </Badge>
        ) : (
          <Badge tone="info" icon={CalendarClock}>
            À venir
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        {next.label}
        {next.hours > 0 && <span className="tabular-nums"> · {formatHours(next.hours)} de conduite</span>}
      </p>

      <p className={cn("mt-4 text-sm", late ? "font-semibold text-danger" : "text-ink-muted")}>
        {late ? "Date limite dépassée : " : "À régler le "}
        <time dateTime={next.dueAt} className={late ? undefined : "font-semibold text-ink"}>
          {formatDate(next.dueAt)}
        </time>
      </p>

      {late ? (
        <ButtonLink
          href="/eleve/paiements"
          fullWidth
          className="mt-4"
          icon={<CreditCard className="size-4" aria-hidden />}
        >
          Régler maintenant
        </ButtonLink>
      ) : (
        <TextLink href="/eleve/paiements" className="-ml-2 mt-2">
          Voir mes paiements
        </TextLink>
      )}
    </CardBody>
  );
}

export function InstallmentCardSkeleton() {
  return (
    <CardBody>
      <LoadingLabel>Chargement de votre prochaine échéance…</LoadingLabel>
      <div className="flex items-center gap-3 py-0.5">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-4 w-48" />
      <Skeleton className="mt-5 h-4 w-44" />
      <div className="mt-2 flex h-11 items-center">
        <Skeleton className="h-5 w-36" />
      </div>
    </CardBody>
  );
}
