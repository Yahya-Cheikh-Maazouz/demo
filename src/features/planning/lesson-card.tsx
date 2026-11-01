import type { ReactNode } from "react";
import { CarFront, MapPin, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  formatDayOfMonth,
  formatMonthShort,
  formatRelativeDay,
  formatTimeRange,
  formatWeekdayShort,
} from "@/lib/format";
import type { Lesson } from "@/lib/types";
import { LESSON_STATUS_META, LESSON_TYPE_META } from "./lesson-meta";

export function LessonStatusBadge({ status }: { status: Lesson["status"] }) {
  const meta = LESSON_STATUS_META[status];
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}

type LessonCardProps = {
  lesson: Lesson;
  /** Server time, for "Aujourd'hui" / "Demain" labels. */
  now: string;
  /** "featured" for the next lesson on the home page. */
  variant?: "default" | "featured";
  /** Extra content (e.g. a cancel button), rendered in the card footer. */
  actions?: ReactNode;
  headingLevel?: "h2" | "h3";
  className?: string;
};

export function LessonCard({
  lesson,
  now,
  variant = "default",
  actions,
  headingLevel: Heading = "h3",
  className,
}: LessonCardProps) {
  const type = LESSON_TYPE_META[lesson.type];
  const featured = variant === "featured";
  const muted = lesson.status === "annule";

  return (
    <article
      className={cn(
        "flex gap-4 rounded-2xl border bg-surface p-4 sm:p-5",
        featured ? "border-brand/30 shadow-raised" : "border-line shadow-card",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-14 shrink-0 flex-col items-center justify-center self-start rounded-xl py-2 text-center",
          featured ? "bg-brand text-on-brand" : "bg-subtle text-ink",
          muted && "opacity-60",
        )}
      >
        <span className="text-[11px] font-semibold uppercase">{formatWeekdayShort(lesson.start)}</span>
        <span className="text-xl leading-tight font-bold tabular-nums">{formatDayOfMonth(lesson.start)}</span>
        <span className="text-[11px] font-medium">{formatMonthShort(lesson.start)}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-muted">
              {formatRelativeDay(lesson.start, now)} · <span className="tabular-nums">{formatTimeRange(lesson.start, lesson.end)}</span>
            </p>
            <Heading className={cn("mt-0.5 flex items-center gap-2 font-bold text-ink", featured ? "text-lg" : "text-base", muted && "line-through decoration-ink-subtle/60")}>
              <type.icon className="size-4.5 shrink-0 text-brand" aria-hidden />
              {type.label}
            </Heading>
          </div>
          <LessonStatusBadge status={lesson.status} />
        </div>

        <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
          <li className="flex items-center gap-2">
            <UserRound className="size-4 shrink-0 text-ink-subtle" aria-hidden />
            <span>
              <span className="sr-only">Moniteur : </span>
              {lesson.instructor.firstName} {lesson.instructor.lastName}
            </span>
          </li>
          {lesson.vehicle && (
            <li className="flex items-center gap-2">
              <CarFront className="size-4 shrink-0 text-ink-subtle" aria-hidden />
              <span>
                <span className="sr-only">Véhicule : </span>
                {lesson.vehicle.label} · {lesson.vehicle.gearbox === "manuelle" ? "Boîte manuelle" : "Boîte automatique"}
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
            <span>
              <span className="sr-only">Lieu de rendez-vous : </span>
              {lesson.meetingPoint}
            </span>
          </li>
        </ul>

        {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </article>
  );
}
