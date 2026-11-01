import { CreditCard } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { CardBody } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { PURCHASE_HREF } from "@/features/accueil/links";
import { BALANCE_STATE_META } from "@/features/solde/balance-meta";
import { BalanceStateBadge } from "@/features/solde/balance-summary";
import { getBalance } from "@/lib/api/eleve";
import { cn } from "@/lib/cn";
import { formatHours } from "@/lib/format";
import type { Balance } from "@/lib/types";

/** Render inside a flex-column <Card> and <Suspense>: the button sticks to the bottom of the card. */
export async function BalanceCardBody() {
  return <BalanceCardView balance={await getBalance()} />;
}

/** Figures list: rows in a narrow card (mobile, side column), 3 × 2 tiles once the card is ≥ 28rem wide. */
const FIGURES_GRID = "grid gap-px overflow-hidden rounded-xl border border-line bg-line @md:grid-cols-3";
const FIGURE_CELL =
  "flex items-center justify-between gap-3 bg-surface px-3.5 @md:flex-col @md:items-start @md:justify-start @md:px-3";

/**
 * Compact hours balance for the home page. Every figure comes from the API as is, in the order of
 * the spec line (forfait · payées · consommées · disponibles · réservées · à couvrir).
 */
export function BalanceCardView({ balance }: { balance: Balance }) {
  const meta = BALANCE_STATE_META[balance.state];
  const needsPayment = balance.state !== "ok";

  const figures = [
    { label: "Heures du forfait", value: balance.packageHours, danger: false },
    { label: "Payées", value: balance.paidHours, danger: false },
    { label: "Consommées", value: balance.consumedHours, danger: false },
    { label: "Disponibles", value: balance.availableHours, danger: balance.availableHours < 0 },
    { label: "Réservées", value: balance.reservedHours, danger: false },
    { label: "À couvrir", value: balance.toCoverHours, danger: balance.toCoverHours > 0 },
  ];

  return (
    <CardBody className="@container flex flex-1 flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-ink-muted">Heures restantes après vos réservations</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p
            className={cn(
              "text-5xl leading-none font-bold tracking-tight tabular-nums",
              balance.afterReservationsHours < 0 ? "text-danger" : "text-ink",
            )}
          >
            {formatHours(balance.afterReservationsHours)}
          </p>
          <BalanceStateBadge state={balance.state} />
        </div>
        {needsPayment && <p className="mt-3 text-sm text-ink-muted">{meta.message(balance)}</p>}
      </div>

      <dl className={FIGURES_GRID}>
        {figures.map((figure) => (
          <div key={figure.label} className={cn(FIGURE_CELL, "py-2 text-sm @md:gap-0.5 @md:py-2.5")}>
            <dt
              className={cn(
                "@md:text-xs @md:font-medium",
                figure.danger ? "font-semibold text-danger" : "text-ink-muted",
              )}
            >
              {figure.label}
            </dt>
            <dd className={cn("font-bold tabular-nums @md:text-base", figure.danger ? "text-danger" : "text-ink")}>
              {formatHours(figure.value)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto">
        {needsPayment ? (
          <ButtonLink
            href={PURCHASE_HREF}
            fullWidth
            className="@md:w-auto"
            icon={<CreditCard className="size-4" aria-hidden />}
          >
            Acheter des heures
          </ButtonLink>
        ) : (
          <ButtonLink href="/eleve/paiements" variant="secondary" fullWidth className="@md:w-auto">
            Voir le détail
          </ButtonLink>
        )}
      </div>
    </CardBody>
  );
}

export function BalanceCardSkeleton() {
  return (
    <CardBody className="@container flex flex-1 flex-col gap-5">
      <LoadingLabel>Chargement de votre solde d&apos;heures…</LoadingLabel>
      {/* One 20px line box per line of text: the label wraps in the narrow side column, the state
          message takes 3 lines in a narrow card, 2 from @md and 1 from @xl. */}
      <div>
        <SkeletonLine width="w-56" />
        <SkeletonLine width="w-20" className="@2xs:hidden" />
        <div className="mt-1 flex h-12 items-center gap-3">
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="mt-3">
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-full" className="@xl:hidden" />
          <SkeletonLine width="w-1/2" className="@md:hidden" />
        </div>
      </div>
      <div className={FIGURES_GRID}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={cn(FIGURE_CELL, "py-2.5 @md:gap-1.5 @md:py-3")}>
            <Skeleton className="h-4 w-24 @md:h-3" />
            <Skeleton className="h-4 w-8 @md:h-5" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-auto h-11 w-full rounded-xl @md:w-44" />
    </CardBody>
  );
}

/** A text-sm line (20px line box) with its placeholder bar. `className` goes on the line box (visibility). */
function SkeletonLine({ width, className }: { width: string; className?: string }) {
  return (
    <div className={cn("flex h-5 items-center", className)}>
      <Skeleton className={cn("h-3.5 max-w-full", width)} />
    </div>
  );
}
