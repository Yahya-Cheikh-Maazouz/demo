import { Ban, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Quota } from "@/lib/types";
import { quotaLevel } from "./status-meta";

const BAR: Record<ReturnType<typeof quotaLevel>, string> = { ok: "bg-brand", warning: "bg-warning", full: "bg-danger" };

/**
 * Usage of the plan's limits, one meter per quota. At 80 % a warning, at 100 % creation is blocked:
 * both are written next to the bar, never shown by its color only.
 */
export function QuotaMeters({ quotas, className }: { quotas: Quota[]; className?: string }) {
  return (
    <ul className={className ?? "space-y-4"}>
      {quotas.map((quota) => {
        const level = quotaLevel(quota);
        const percent = quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 100;
        return (
          <li key={quota.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">{quota.label}</span>
              <span className="text-ink-muted tabular-nums">
                <span className="font-bold text-ink">{quota.used}</span> / {quota.limit}
              </span>
            </div>
            <div
              role="meter"
              aria-label={quota.label}
              aria-valuemin={0}
              aria-valuemax={quota.limit}
              aria-valuenow={Math.min(quota.used, quota.limit)}
              aria-valuetext={`${quota.used} sur ${quota.limit}`}
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-subtle"
            >
              <div className={cn("h-full rounded-full", BAR[level])} style={{ width: `${percent}%` }} />
            </div>
            {level === "warning" && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
                <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
                Plus de 80 % de la limite utilisée
              </p>
            )}
            {level === "full" && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-danger">
                <Ban className="size-3.5 shrink-0" aria-hidden />
                Limite atteinte : création bloquée (l&apos;existant reste accessible)
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
