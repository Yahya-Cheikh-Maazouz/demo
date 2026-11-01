import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatHours } from "@/lib/format";
import type { Balance } from "@/lib/types";
import { BALANCE_STATE_META } from "./balance-meta";

export function BalanceStateBadge({ state }: { state: Balance["state"] }) {
  const meta = BALANCE_STATE_META[state];
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}

/**
 * Hours balance: headline, stacked bar and the figures line from the spec
 * ("Heures du forfait · Payées · Consommées · Disponibles · Réservées · À couvrir").
 * The bar is decorative; the figures below carry the information.
 */
export function BalanceSummary({ balance, className }: { balance: Balance; className?: string }) {
  const meta = BALANCE_STATE_META[balance.state];
  const scale = Math.max(balance.packageHours, balance.consumedHours + balance.reservedHours, balance.paidHours);
  const pct = (hours: number) => `${Math.max(0, (hours / scale) * 100)}%`;
  const free = Math.max(0, balance.afterReservationsHours);

  const figures: Array<{ label: string; value: number; emphasis?: boolean }> = [
    { label: "Heures du forfait", value: balance.packageHours },
    { label: "Payées", value: balance.paidHours },
    { label: "Consommées", value: balance.consumedHours },
    { label: "Disponibles", value: balance.availableHours, emphasis: true },
    { label: "Réservées", value: balance.reservedHours },
    { label: "À couvrir", value: balance.toCoverHours },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-muted">Heures restantes après vos réservations</p>
          <p
            className={cn(
              "text-4xl font-bold tracking-tight tabular-nums",
              balance.afterReservationsHours < 0 ? "text-danger" : "text-ink",
            )}
          >
            {formatHours(balance.afterReservationsHours)}
          </p>
        </div>
        <BalanceStateBadge state={balance.state} />
      </div>

      <div aria-hidden className="flex h-3 overflow-hidden rounded-full bg-subtle">
        <div className="bg-ink-subtle/70" style={{ width: pct(balance.consumedHours) }} />
        <div className="bg-brand/45" style={{ width: pct(Math.min(balance.reservedHours, Math.max(balance.availableHours, 0))) }} />
        <div className="bg-danger/70" style={{ width: pct(balance.toCoverHours) }} />
        <div className="bg-brand" style={{ width: pct(free) }} />
      </div>
      <ul aria-hidden className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-ink-subtle/70" /> Consommées
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-brand/45" /> Réservées
        </li>
        {balance.toCoverHours > 0 && (
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-danger/70" /> À couvrir
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-brand" /> Libres
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border border-line-strong bg-subtle" /> Non payées
        </li>
      </ul>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
        {figures.map((f) => (
          <div key={f.label} className="bg-surface px-3 py-2.5">
            <dt className="text-xs font-medium text-ink-subtle">{f.label}</dt>
            <dd
              className={cn(
                "text-base font-bold tabular-nums",
                f.label === "À couvrir" && f.value > 0 ? "text-danger" : f.emphasis ? "text-brand" : "text-ink",
              )}
            >
              {formatHours(f.value)}
            </dd>
          </div>
        ))}
      </dl>

      {balance.state !== "ok" && <p className="text-sm text-ink-muted">{meta.message(balance)}</p>}
    </div>
  );
}
