import { CreditCard, Wallet } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { BalanceStateBadge } from "@/features/solde/balance-summary";
import { cn } from "@/lib/cn";
import { formatHours } from "@/lib/format";
import type { Balance } from "@/lib/types";
import { getPlanningBalance } from "./data";

/** Length of a standard driving lesson, the unit the student books. */
export const STANDARD_LESSON_HOURS = 2;

/** Render inside <Suspense>. */
export async function BookingBalance() {
  return <BookingBalanceView balance={await getPlanningBalance()} />;
}

/**
 * Hours left before booking. Figures come from the API as is; the only thing decided here is
 * whether they cover one more standard lesson.
 */
export function BookingBalanceView({ balance }: { balance: Balance }) {
  const remaining = balance.afterReservationsHours;
  const covers = remaining >= STANDARD_LESSON_HOURS;
  const lessonsLeft = Math.floor(Math.max(remaining, 0) / STANDARD_LESSON_HOURS);

  return (
    <section
      aria-labelledby="reservation-solde"
      className={cn(
        "rounded-2xl border bg-surface p-4 shadow-card sm:p-5",
        covers ? "border-line" : "border-warning/30",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl",
              covers ? "bg-brand-soft text-brand" : "bg-warning-soft text-warning",
            )}
          >
            <Wallet className="size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="reservation-solde" className="text-sm font-medium text-ink-muted">
              Heures restantes après vos réservations
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p
                className={cn(
                  "text-2xl leading-tight font-bold tracking-tight tabular-nums",
                  remaining < 0 ? "text-danger" : "text-ink",
                )}
              >
                {formatHours(remaining)}
              </p>
              <BalanceStateBadge state={balance.state} />
            </div>
          </div>
        </div>

        {covers ? (
          <p className="text-sm text-ink-muted lg:ml-auto lg:max-w-xs lg:text-right">
            De quoi réserver{" "}
            <strong className="font-semibold text-ink tabular-nums">
              {lessonsLeft} {lessonsLeft > 1 ? "leçons" : "leçon"} de {formatHours(STANDARD_LESSON_HOURS)}
            </strong>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between lg:ml-auto lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            <p className="text-sm text-ink-muted sm:max-w-md">
              <strong className="font-semibold text-ink">
                Votre solde ne couvre pas une leçon de {formatHours(STANDARD_LESSON_HOURS)}.
              </strong>{" "}
              Vous pouvez quand même réserver : la demande sera envoyée « en attente de paiement » et
              l&apos;auto-école la validera après votre paiement.
            </p>
            <ButtonLink
              href="/eleve/paiements"
              variant="secondary"
              className="shrink-0"
              icon={<CreditCard className="size-4" aria-hidden />}
            >
              Acheter des heures
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}

export function BookingBalanceSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <LoadingLabel>Chargement de votre solde…</LoadingLabel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 shrink-0 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-60 max-w-full" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
        <div className="space-y-1.5 lg:w-80">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3 lg:ml-auto" />
        </div>
      </div>
    </div>
  );
}
