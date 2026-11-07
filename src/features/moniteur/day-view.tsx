import Link from "next/link";
import { CalendarCheck2, CalendarOff, ChevronLeft, ChevronRight, Coffee, PenLine } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { LESSON_TYPE_META } from "@/features/planning/lesson-meta";
import { getInstructorDay } from "@/lib/api/moniteur";
import { cn } from "@/lib/cn";
import { formatDateLong, formatDayOfMonth, formatHours, formatRelativeDay, formatTime, formatTimeRange, formatWeekdayShort } from "@/lib/format";
import { addDays, parisDateTime } from "@/lib/paris-time";
import type { InstructorLeave, InstructorLesson } from "@/lib/types";
import { InstructorLessonCard } from "./lesson-card";
import { dayHref, isToSign } from "./lesson-status";

type Params = Record<string, string | string[] | undefined>;

/** `?date=YYYY-MM-DD`; null (today) when absent or malformed. The API checks it is a real day. */
export function parseDayParam(params: Params): string | null {
  const value = params.date;
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** Noon of a Paris calendar day, to format it. */
const middayOf = (date: string) => parisDateTime(date, 12).toISOString();

/** "Mer. 4" */
function shortDay(date: string) {
  const iso = middayOf(date);
  const weekday = formatWeekdayShort(iso);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatDayOfMonth(iso)}`;
}

function DayNav({ date, today }: { date: string; today: string }) {
  const previous = addDays(date, -1);
  const next = addDays(date, 1);
  const isToday = date === today;
  const cell = "h-12 rounded-2xl px-2 text-sm";
  return (
    <nav aria-label="Changer de jour" className="mb-6 grid grid-cols-3 gap-2">
      <Link
        href={dayHref(previous, today)}
        className={buttonStyles({ variant: "secondary", className: cell })}
        aria-label={`Jour précédent : ${formatDateLong(middayOf(previous))}`}
      >
        <ChevronLeft className="size-5 shrink-0" aria-hidden />
        {shortDay(previous)}
      </Link>
      <Link
        href="/moniteur"
        aria-current={isToday ? "date" : undefined}
        className={buttonStyles({
          variant: isToday ? "ghost" : "secondary",
          className: cn(cell, isToday && "bg-brand-soft text-brand hover:bg-brand-soft hover:text-brand"),
        })}
      >
        Aujourd&apos;hui
      </Link>
      <Link
        href={dayHref(next, today)}
        className={buttonStyles({ variant: "secondary", className: cell })}
        aria-label={`Jour suivant : ${formatDateLong(middayOf(next))}`}
      >
        {shortDay(next)}
        <ChevronRight className="size-5 shrink-0" aria-hidden />
      </Link>
    </nav>
  );
}

/** "Toute la journée", "Jusqu'à 14:00", "À partir de 10:00" or "10:00 – 14:00". */
function leaveRange(leave: InstructorLeave, date: string): string {
  const dayStart = parisDateTime(date, 0).toISOString();
  const dayEnd = parisDateTime(addDays(date, 1), 0).toISOString();
  const fromBefore = leave.start <= dayStart;
  const toAfter = leave.end >= dayEnd;
  if (fromBefore && toAfter) return "Toute la journée";
  if (fromBefore) return `Jusqu'à ${formatTime(leave.end)}`;
  if (toAfter) return `À partir de ${formatTime(leave.start)}`;
  return formatTimeRange(leave.start, leave.end);
}

function LeaveBand({ leave, date }: { leave: InstructorLeave; date: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-dashed border-warning/40 bg-warning-soft px-4 py-3">
      <CalendarOff className="size-5 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-ink">Indisponible · {leave.reason}</p>
        <p className="text-sm text-ink-muted">
          {leaveRange(leave, date)}
          {leave.declaredByInstructor ? "" : " · saisie par l'accueil"}
        </p>
      </div>
    </li>
  );
}

/** Lessons of other days that started and still wait for the émargement (or the absence). */
function ToClose({ lessons, today }: { lessons: InstructorLesson[]; today: string }) {
  return (
    <Card className="mb-6 border-warning/30 p-4 sm:p-5">
      <p className="eyebrow">À clôturer</p>
      <h2 className="mt-1.5 text-lg font-extrabold tracking-[-0.02em] text-ink">
        {lessons.length > 1 ? `${lessons.length} leçons attendent l'émargement` : "Une leçon attend l'émargement"}
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {lessons.map((lesson) => (
          <li key={lesson.id}>
            <Link
              href={`/moniteur/lecons/${lesson.id}`}
              className="-mx-2 flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-subtle"
            >
              <PenLine className="size-5 shrink-0 text-warning" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">
                  {lesson.student.firstName} {lesson.student.lastName}
                </span>
                <span className="block text-sm text-ink-muted">
                  {formatRelativeDay(lesson.start, `${today}T12:00:00Z`)} · {formatTimeRange(lesson.start, lesson.end)} ·{" "}
                  {LESSON_TYPE_META[lesson.type].label}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-ink-subtle" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function summaryOf(lessons: InstructorLesson[], now: string): string {
  const active = lessons.filter((l) => l.status !== "annule");
  if (active.length === 0) return "Aucune leçon prévue ce jour-là.";
  const hours = active.reduce((sum, l) => sum + l.durationHours, 0);
  const toSign = active.filter((l) => isToSign(l, now)).length;
  const base = `${active.length} ${active.length > 1 ? "leçons" : "leçon"} · ${formatHours(hours)}`;
  return toSign > 0 ? `${base} · ${toSign} à émarger` : base;
}

/** "Ma journée": navigation between days, leaves, lessons in time order. Render inside <Suspense>. */
export async function DayView({ date }: { date: string | null }) {
  const day = await getInstructorDay(date);
  const isToday = day.date === day.today;
  const iso = middayOf(day.date);
  const relative = formatRelativeDay(iso, `${day.today}T12:00:00Z`);
  return (
    <>
      <PageHeader
        eyebrow={isToday ? "Ma journée · aujourd'hui" : relative === "Demain" || relative === "Hier" ? `Ma journée · ${relative.toLowerCase()}` : "Ma journée"}
        title={formatDateLong(iso)}
        description={summaryOf(day.lessons, day.now)}
        className="mb-5 sm:mb-6"
      />
      <DayNav date={day.date} today={day.today} />

      {day.toClose.length > 0 && <ToClose lessons={day.toClose} today={day.today} />}

      {day.leaves.length > 0 && (
        <ul aria-label="Indisponibilités du jour" className="mb-4 space-y-2">
          {day.leaves.map((leave) => (
            <LeaveBand key={leave.id} leave={leave} date={day.date} />
          ))}
        </ul>
      )}

      {day.lessons.length === 0 ? (
        <Card>
          <EmptyState
            icon={day.leaves.length > 0 ? Coffee : CalendarCheck2}
            title={day.leaves.length > 0 ? "Pas de leçon : vous êtes indisponible" : "Aucune leçon ce jour-là"}
            description="Les demandes des élèves arrivent dans « Demandes » : une fois confirmées, elles apparaissent ici."
            action={
              <Link href="/moniteur/demandes" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                Voir les demandes
              </Link>
            }
          />
        </Card>
      ) : (
        <ol aria-label="Leçons du jour" className="space-y-4">
          {day.lessons.map((lesson) => (
            <li key={lesson.id}>
              <InstructorLessonCard lesson={lesson} now={day.now} />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export function DayViewSkeleton() {
  return (
    <div>
      <LoadingLabel>Chargement de votre journée…</LoadingLabel>
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-3 h-9 w-64 max-w-full" />
      <Skeleton className="mt-3 h-5 w-48" />
      <div className="mt-5 mb-6 grid grid-cols-3 gap-2 sm:mt-6">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[19rem] rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
