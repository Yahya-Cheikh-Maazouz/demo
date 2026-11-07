import type { ReactNode } from "react";
import { CalendarOff, CalendarRange, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getInstructorLeaves, getNow } from "@/lib/api/moniteur";
import { dayKey, formatDateLong, formatTime } from "@/lib/format";
import { addDays } from "@/lib/paris-time";
import { getTenant } from "@/lib/tenant";
import type { InstructorLeave } from "@/lib/types";
import { DeleteLeaveButton } from "./delete-leave-button";
import { LeaveForm } from "./leave-form";

/** "Du jeudi 12 novembre à 08:00 au vendredi 13 novembre à 20:00", or on one day "Jeudi 12 novembre, 08:00 – 20:00". */
export function leavePeriod(leave: Pick<InstructorLeave, "start" | "end">): string {
  if (dayKey(leave.start) === dayKey(leave.end)) {
    return `${formatDateLong(leave.start)}, ${formatTime(leave.start)} – ${formatTime(leave.end)}`;
  }
  return `Du ${formatDateLong(leave.start).toLowerCase()} à ${formatTime(leave.start)} au ${formatDateLong(leave.end).toLowerCase()} à ${formatTime(leave.end)}`;
}

/** The declaration form (defaults to tomorrow). Render inside <Suspense>. */
export async function LeaveFormSection() {
  const [now, tenant] = await Promise.all([getNow(), getTenant()]);
  const today = dayKey(now);
  return <LeaveForm today={today} defaultDay={addDays(today, 1)} agencyPhone={tenant?.phone ?? null} />;
}

export function LeaveFormSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1].map((i) => (
        <div key={i}>
          <Skeleton className="h-5 w-16" />
          <div className="mt-2 grid grid-cols-[1fr_8rem] gap-3">
            <Skeleton className="h-[4.75rem] rounded-xl" />
            <Skeleton className="h-[4.75rem] rounded-xl" />
          </div>
        </div>
      ))}
      <Skeleton className="h-5 w-16" />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-14 rounded-2xl" />
    </div>
  );
}

/** Current and upcoming leaves; the instructor deletes the ones they declared until they start. */
export async function LeavesList() {
  const { now, leaves } = await getInstructorLeaves();
  if (leaves.length === 0) {
    return (
      <Card>
        <EmptyState icon={CalendarRange} title="Aucune indisponibilité à venir" description="Vos congés, arrêts et formations déclarés apparaîtront ici." />
      </Card>
    );
  }
  return (
    <ul className="space-y-3">
      {leaves.map((leave) => {
        const started = leave.start <= now;
        const period = leavePeriod(leave);
        return (
          <li key={leave.id}>
            <Card className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-warning-soft text-warning">
                  <CalendarOff className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-ink">{leave.reason}</h3>
                    {started && (
                      <Badge tone="warning" icon={Clock}>
                        En cours
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">{period}</p>
                  {!leave.declaredByInstructor && <p className="mt-1 text-xs text-ink-subtle">Saisie par l&apos;accueil</p>}
                </div>
              </div>
              {leave.declaredByInstructor && !started && (
                <div className="mt-3 flex justify-end border-t border-line pt-3">
                  <DeleteLeaveButton leaveId={leave.id} summary={`${leave.reason} · ${period}`} />
                </div>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

export function LeavesListSkeleton() {
  return (
    <div className="space-y-3">
      <LoadingLabel>Chargement de vos indisponibilités…</LoadingLabel>
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-28 rounded-3xl" />
      ))}
    </div>
  );
}

export function LeaveFormCard({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardHeader
        icon={<CalendarOff className="size-5" aria-hidden />}
        title="Déclarer une indisponibilité"
        description="Les créneaux bloqués disparaissent de l'agenda des élèves et du planning de l'accueil."
      />
      <CardBody>{children}</CardBody>
    </Card>
  );
}
