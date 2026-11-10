import Link from "next/link";
import { CalendarCheck, CalendarClock, CalendarRange, ChevronRight, Info, PenLine, UserX, type LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { getInstructorHours } from "@/lib/api/moniteur";
import { formatDayOfMonth, formatHours, formatMonthShort, formatMonthYear } from "@/lib/format";
import { addDays, parisDateTime } from "@/lib/paris-time";

const lessonsLabel = (count: number, adjective: string) => `${count} ${count > 1 ? `leçons ${adjective}s` : `leçon ${adjective}`}`;

function Stat({
  icon: Icon,
  eyebrow,
  value,
  detail,
  hint,
}: {
  icon: LucideIcon;
  eyebrow: string;
  value: string;
  detail: string;
  hint?: string;
}) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <p className="mt-1.5 text-[2rem] leading-none font-extrabold tracking-[-0.03em] text-ink tabular-nums">{value}</p>
        <p className="mt-1.5 text-sm font-semibold text-ink-muted">{detail}</p>
        {hint && <p className="mt-0.5 text-sm text-ink-subtle">{hint}</p>}
      </div>
    </Card>
  );
}

/** "du 2 au 8 nov.", or "du 30 nov. au 6 déc." when the week spans two months. */
function weekRange(monday: string): string {
  const start = parisDateTime(monday, 12).toISOString();
  const end = parisDateTime(addDays(monday, 6), 12).toISOString();
  const startMonth = formatMonthShort(start);
  const endMonth = formatMonthShort(end);
  const from = startMonth === endMonth ? formatDayOfMonth(start) : `${formatDayOfMonth(start)} ${startMonth}`;
  return `du ${from} au ${formatDayOfMonth(end)} ${endMonth}`;
}

/** Hours given this week and this month, and what is left this week. Render inside <Suspense>. */
export async function HoursSummary() {
  const { week, month } = await getInstructorHours();
  const monthLabel = formatMonthYear(parisDateTime(month.start, 12).toISOString());
  return (
    <div className="space-y-4">
      <section aria-labelledby="heures-semaine" className="space-y-3">
        <h2 id="heures-semaine" className="text-lg font-extrabold tracking-[-0.02em] text-ink">
          Cette semaine <span className="text-base font-semibold text-ink-subtle">· {weekRange(week.start)}</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat icon={CalendarCheck} eyebrow="Effectuées" value={formatHours(week.doneHours)} detail={lessonsLabel(week.doneLessons, "effectuée")} />
          <Stat
            icon={CalendarClock}
            eyebrow="Reste à faire"
            value={formatHours(week.plannedHours)}
            detail={lessonsLabel(week.plannedLessons, "confirmée")}
            hint={week.requestedHours > 0 ? `+ ${formatHours(week.requestedHours)} de demandes à confirmer` : undefined}
          />
        </div>
        {week.toSignLessons > 0 && (
          // Started but not signed: in neither figure above until the émargement.
          <Link
            href="/moniteur"
            className="flex items-center gap-4 rounded-3xl border border-warning/40 bg-warning-soft p-5 transition-colors hover:border-warning/60"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-warning">
              <PenLine className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="eyebrow block">À émarger</span>
              <span className="mt-1.5 block text-[2rem] leading-none font-extrabold tracking-[-0.03em] text-ink tabular-nums">
                {formatHours(week.toSignHours)}
              </span>
              <span className="mt-1.5 block text-sm font-semibold text-ink-muted">
                {week.toSignLessons > 1 ? `${week.toSignLessons} leçons commencées, pas encore signées` : "1 leçon commencée, pas encore signée"}
              </span>
              <span className="mt-0.5 block text-sm text-ink-muted">Comptées dans « Effectuées » une fois émargées.</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ink-subtle" aria-hidden />
          </Link>
        )}
      </section>

      <section aria-labelledby="heures-mois" className="space-y-3 pt-2">
        <h2 id="heures-mois" className="text-lg font-extrabold tracking-[-0.02em] text-ink">
          {monthLabel}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat icon={CalendarRange} eyebrow="Effectuées" value={formatHours(month.doneHours)} detail={lessonsLabel(month.doneLessons, "effectuée")} />
          <Stat
            icon={UserX}
            eyebrow="Élèves absents"
            value={String(month.noShows)}
            detail={month.noShows > 1 ? "absences enregistrées" : "absence enregistrée"}
          />
        </div>
      </section>

      <Alert tone="info" icon={Info} title="Commissions" className="mt-2">
        Le détail de vos commissions arrivera avec le suivi financier (V1). En attendant, vos heures sont celles des leçons
        émargées.
      </Alert>
    </div>
  );
}

export function HoursSummarySkeleton() {
  return (
    <div className="space-y-4">
      <LoadingLabel>Chargement de vos heures…</LoadingLabel>
      {[0, 1].map((section) => (
        <div key={section} className="space-y-3">
          <Skeleton className="h-6 w-56" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-[8.5rem] rounded-3xl" />
            <Skeleton className="h-[8.5rem] rounded-3xl" />
          </div>
        </div>
      ))}
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
