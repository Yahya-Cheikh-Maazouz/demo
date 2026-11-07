import { CalendarDays, CalendarPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { LESSON_TYPE_META, studentStatusMeta } from "@/features/planning/lesson-meta";
import { getLessons } from "@/lib/api/eleve";
import { cn } from "@/lib/cn";
import { formatDateLong, formatTime } from "@/lib/format";

const frame = cn(
  "relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-l-4 border-brand/20 border-l-brand",
  "bg-linear-to-r from-brand-soft via-surface to-surface p-4 shadow-card sm:flex-row sm:items-center sm:gap-5 sm:p-5",
);

/**
 * "Rappel · Prochaine leçon" banner shown above the student's forms (availabilities, starting
 * evaluation), with a link to the planning (or to booking when nothing is planned). Render inside <Suspense>.
 */
export async function NextLessonReminder() {
  const { upcoming } = await getLessons();
  const next = upcoming[0];

  return (
    <section aria-labelledby="rappel-prochaine-lecon" className={frame}>
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-brand shadow-card">
          {next ? <CalendarDays className="size-5" aria-hidden /> : <CalendarPlus className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="rappel-prochaine-lecon" className="eyebrow">
            Rappel · Prochaine leçon
          </h2>
          {next ? (
            <>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-lg font-bold tracking-[-0.01em] text-ink">
                <span>
                  {formatDateLong(next.start)} · <span className="tabular-nums">{formatTime(next.start)}</span>
                </span>
                {next.status !== "confirme" && <NextLessonStatus lesson={next} />}
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {LESSON_TYPE_META[next.type].label} · avec {next.instructor.firstName} {next.instructor.lastName}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-lg font-bold tracking-[-0.01em] text-ink">Aucune leçon prévue</p>
              <p className="mt-0.5 text-sm text-ink-muted">Choisissez un créneau libre avec votre moniteur·rice.</p>
            </>
          )}
        </div>
      </div>
      {next ? (
        <ButtonLink
          href="/eleve/planning"
          variant="secondary"
          icon={<CalendarDays className="size-4" aria-hidden />}
          className="w-full shrink-0 sm:w-auto"
        >
          Voir le planning
        </ButtonLink>
      ) : (
        <ButtonLink
          href="/eleve/planning/reserver"
          variant="secondary"
          icon={<CalendarPlus className="size-4" aria-hidden />}
          className="w-full shrink-0 sm:w-auto"
        >
          Réserver une leçon
        </ButtonLink>
      )}
    </section>
  );
}

function NextLessonStatus({ lesson }: { lesson: Parameters<typeof studentStatusMeta>[0] }) {
  const meta = studentStatusMeta(lesson);
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}

export function NextLessonReminderSkeleton() {
  return (
    <div className={frame}>
      <LoadingLabel>Chargement de votre prochaine leçon…</LoadingLabel>
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
        <Skeleton className="size-11 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-40 max-w-full" />
          <Skeleton className="h-6 w-56 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-11 w-full shrink-0 rounded-xl sm:w-44" />
    </div>
  );
}
