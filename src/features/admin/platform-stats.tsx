import { Building2, TriangleAlert, Wallet } from "lucide-react";
import { SUBSCRIPTION_STATUSES, SUBSCRIPTION_STATUS_META } from "@/features/abonnement/status-meta";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import type { PlatformOverview } from "@/lib/types";
import { TONE_TEXT } from "@/components/ui/tone";

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

/** Monthly revenue, unpaid amounts and the number of schools per status. */
export function PlatformStats({ overview }: { overview: PlatformOverview }) {
  const { mrr, unpaidMrr, countsByStatus, schools } = overview;
  const unpaidCount = countsByStatus.impaye + countsByStatus.lecture_seule;

  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="relative overflow-hidden rounded-3xl bg-sidebar p-5 text-white shadow-raised sm:col-span-2 xl:col-span-1">
        <dt className="flex items-center gap-2 text-sm font-medium text-white/75">
          <Wallet className="size-4 text-brand-bright" aria-hidden />
          Revenu mensuel (MRR)
        </dt>
        <dd className="mt-2 text-4xl font-extrabold tracking-[-0.03em] tabular-nums">{formatCurrency(mrr, { round: true })}</dd>
        <dd className="mt-1 text-sm text-white/70">{plural(countsByStatus.actif, "auto-école payante", "auto-écoles payantes")}</dd>
      </div>

      <div className="rounded-3xl border border-line/80 bg-surface p-5 shadow-card">
        <dt className="flex items-center gap-2 text-sm font-medium text-ink-muted">
          <TriangleAlert className="size-4 text-warning" aria-hidden />
          Impayés en cours
        </dt>
        <dd className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink tabular-nums">
          {formatCurrency(unpaidMrr, { round: true })}
          <span className="text-base font-semibold text-ink-subtle"> / mois</span>
        </dd>
        <dd className="mt-1 text-sm text-ink-muted">
          {unpaidCount === 0 ? "Aucun abonnement impayé" : plural(unpaidCount, "auto-école impayée ou en lecture seule", "auto-écoles impayées ou en lecture seule")}
        </dd>
      </div>

      <div className="rounded-3xl border border-line/80 bg-surface p-5 shadow-card sm:col-span-2 xl:col-span-3">
        <dt className="flex items-center gap-2 text-sm font-medium text-ink-muted">
          <Building2 className="size-4 text-brand" aria-hidden />
          {plural(schools.length, "auto-école", "auto-écoles")} par statut
        </dt>
        <dd className="mt-3">
          <ul className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:grid-cols-5">
            {SUBSCRIPTION_STATUSES.map((status) => {
              const meta = SUBSCRIPTION_STATUS_META[status];
              return (
                <li key={status} className="rounded-2xl bg-subtle px-3 py-2.5">
                  <span className={cn("flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap", TONE_TEXT[meta.tone])}>
                    <meta.icon className="size-3.5 shrink-0" aria-hidden />
                    {meta.label}
                  </span>
                  <span className="mt-0.5 block text-2xl font-extrabold text-ink tabular-nums">{countsByStatus[status]}</span>
                </li>
              );
            })}
          </ul>
        </dd>
      </div>
    </dl>
  );
}
