import { CalendarDays, CalendarPlus, CalendarRange } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";
import { LessonCard } from "@/features/planning/lesson-card";
import { cn } from "@/lib/cn";
import type { Lesson } from "@/lib/types";
import { getHomeLessons } from "./data";

const UPCOMING_COUNT = 3;

type LessonsProps = { now: string; upcoming: Lesson[] };

/** Render inside <Suspense>. */
export async function NextLesson() {
  const { now, upcoming } = await getHomeLessons();
  return <NextLessonView now={now} upcoming={upcoming} />;
}

/** Render inside <Suspense>. */
export async function UpcomingLessons() {
  const { now, upcoming } = await getHomeLessons();
  return <UpcomingLessonsView now={now} upcoming={upcoming} />;
}

/** "Prochaine leçon": the soonest upcoming lesson, or an invitation to book. */
export function NextLessonView({ now, upcoming }: LessonsProps) {
  const next = upcoming[0];

  if (!next) {
    return (
      <Card>
        <EmptyState
          icon={CalendarPlus}
          title="Aucune leçon prévue"
          description="Choisissez un créneau libre avec votre moniteur : votre prochaine leçon s'affichera ici."
          action={
            <ButtonLink href="/eleve/planning/reserver" icon={<CalendarPlus className="size-4" aria-hidden />}>
              Réserver une leçon
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  return (
    <LessonCard
      lesson={next}
      now={now}
      variant="featured"
      headingLevel="h3"
      actions={
        <ButtonLink
          href="/eleve/planning"
          variant="secondary"
          icon={<CalendarDays className="size-4" aria-hidden />}
        >
          Voir mon planning
        </ButtonLink>
      }
    />
  );
}

/** "À venir": the lessons that follow the next one. */
export function UpcomingLessonsView({ now, upcoming }: LessonsProps) {
  const following = upcoming.slice(1, 1 + UPCOMING_COUNT);

  if (following.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-5 text-sm text-ink-muted sm:p-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink-subtle">
          <CalendarRange className="size-5" aria-hidden />
        </span>
        <p>
          {upcoming.length === 0
            ? "Rien de prévu pour l'instant. Vos prochaines leçons apparaîtront ici."
            : "Aucune autre leçon prévue après celle-ci pour l'instant."}
        </p>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {following.map((lesson) => (
        <li key={lesson.id}>
          <LessonCard lesson={lesson} now={now} headingLevel="h3" />
        </li>
      ))}
    </ul>
  );
}

/** Same footprint as a LessonCard, to avoid layout shift while the lessons stream in. */
function LessonCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={cn(
        "flex gap-4 rounded-2xl border bg-surface p-4 sm:p-5",
        featured ? "border-brand/30 shadow-raised" : "border-line shadow-card",
      )}
    >
      <Skeleton className="h-18.5 w-14 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        {/* On mobile the real badge wraps under the title and the address takes two lines. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-44 max-w-full" />
            <Skeleton className={cn("max-w-full", featured ? "h-6 w-48" : "h-5 w-40")} />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="mt-3.5 space-y-2.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-52 max-w-full" />
          <Skeleton className="h-4 w-60 max-w-full" />
          <Skeleton className="h-4 w-28 sm:hidden" />
        </div>
        {featured && <Skeleton className="mt-4 h-11 w-44 rounded-xl" />}
      </div>
    </div>
  );
}

export function NextLessonSkeleton() {
  return (
    <>
      <LoadingLabel>Chargement de votre prochaine leçon…</LoadingLabel>
      <LessonCardSkeleton featured />
    </>
  );
}

export function UpcomingLessonsSkeleton() {
  return (
    <div className="space-y-3">
      <LoadingLabel>Chargement de vos leçons à venir…</LoadingLabel>
      <LessonCardSkeleton />
      <LessonCardSkeleton />
    </div>
  );
}
