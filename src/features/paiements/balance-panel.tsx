import { ArrowDown, CalendarPlus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { CardBody } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { BalanceSummary } from "@/features/solde/balance-summary";
import { formatCurrency } from "@/lib/format";
import { getPageBalance } from "./data";

export const PURCHASE_ANCHOR = "acheter-des-heures";

/** "Forfait B — 20 h · 60 € / h", for the card header. Render inside <Suspense>. */
export async function PackageLine() {
  const balance = await getPageBalance();
  return (
    <span className="tabular-nums">
      {balance.packageName} · {formatCurrency(balance.hourlyRate, { round: true })} / h
    </span>
  );
}

export function PackageLineSkeleton() {
  return <Skeleton inline className="h-4 w-44" />;
}

/** Full hours balance. Every figure comes from the API as is. Render inside a <Card> and <Suspense>. */
export async function BalancePanel() {
  const balance = await getPageBalance();
  const needsPayment = balance.state !== "ok";

  return (
    <CardBody className="flex flex-1 flex-col gap-5">
      <BalanceSummary balance={balance} />

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-subtle px-3.5 py-3">
          <dt className="text-xs font-medium text-ink-subtle">Prix du forfait</dt>
          <dd className="mt-0.5 font-bold text-ink tabular-nums">{formatCurrency(balance.packagePrice)}</dd>
        </div>
        <div className="rounded-xl bg-subtle px-3.5 py-3">
          <dt className="text-xs font-medium text-ink-subtle">Déjà réglé</dt>
          <dd className="mt-0.5 font-bold text-ink tabular-nums">{formatCurrency(balance.paidAmount)}</dd>
        </div>
      </dl>

      <div className="mt-auto">
        {needsPayment ? (
          <ButtonLink
            href={`#${PURCHASE_ANCHOR}`}
            variant="secondary"
            className="w-full sm:w-auto"
            icon={<ArrowDown className="size-4" aria-hidden />}
          >
            Acheter des heures
          </ButtonLink>
        ) : (
          <ButtonLink
            href="/eleve/planning"
            variant="secondary"
            className="w-full sm:w-auto"
            icon={<CalendarPlus className="size-4" aria-hidden />}
          >
            Réserver une leçon
          </ButtonLink>
        )}
      </div>
    </CardBody>
  );
}

export function BalancePanelSkeleton() {
  return (
    <CardBody className="flex flex-1 flex-col gap-5">
      <LoadingLabel>Chargement de votre solde d&apos;heures…</LoadingLabel>
      <div className="flex items-end justify-between gap-3">
        <div>
          <Skeleton className="h-4 w-60 max-w-full" />
          <Skeleton className="mt-2 h-9 w-20" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-surface px-3 py-2.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-4 w-10" />
          </div>
        ))}
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl sm:w-48" />
    </CardBody>
  );
}
