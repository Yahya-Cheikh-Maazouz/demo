import Link from "next/link";
import { TONE_SOLID } from "@/components/ui/tone";
import { cn } from "@/lib/cn";
import { dayKey, formatDateLong, formatTime } from "@/lib/format";
import type { Leave, PlanningLesson } from "@/lib/types";
import { LESSON_STATUS_META } from "../lesson-meta";
import { noonOf } from "./agenda-range";

const WEEKDAYS = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];
const MAX_LINES = 3;

type MonthGridProps = {
  days: string[];
  /** "2026-11": days of other months are dimmed. */
  month: string;
  todayKey: string;
  lessons: PlanningLesson[];
  leaves: Leave[];
  dayHref: (day: string) => string;
};

/** Month overview: each day links to its day view. */
export function MonthGrid({ days, month, todayKey, lessons, leaves, dayHref }: MonthGridProps) {
  const byDay = new Map<string, PlanningLesson[]>();
  for (const lesson of lessons) {
    const key = dayKey(lesson.start);
    byDay.set(key, [...(byDay.get(key) ?? []), lesson]);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div aria-hidden className="grid grid-cols-7 border-b border-line bg-subtle">
        {WEEKDAYS.map((label) => (
          <span key={label} className="px-2 py-2 text-center text-xs font-semibold text-ink-subtle">
            {label}
          </span>
        ))}
      </div>
      <ul className="grid grid-cols-7">
        {days.map((day, index) => {
          const items = (byDay.get(day) ?? []).filter((l) => l.status !== "annule");
          const inMonth = day.startsWith(month);
          const isToday = day === todayKey;
          const onLeave = leaves.some((l) => dayKey(l.start) <= day && dayKey(new Date(Date.parse(l.end) - 1).toISOString()) >= day);
          const label = `${formatDateLong(noonOf(day))} : ${items.length === 0 ? "aucun RDV" : `${items.length} RDV`}`;
          return (
            <li key={day} className={cn("min-w-0 border-line", index % 7 !== 0 && "border-l", index >= 7 && "border-t")}>
              <Link
                href={dayHref(day)}
                aria-label={label}
                className={cn(
                  "flex h-full min-h-20 flex-col gap-1 p-1.5 transition-colors hover:bg-subtle sm:min-h-28 sm:p-2",
                  !inMonth && "bg-canvas/60",
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                      isToday ? "bg-brand text-on-brand" : inMonth ? "text-ink" : "text-ink-subtle",
                    )}
                  >
                    {Number(day.slice(8))}
                  </span>
                  {items.length > 0 && (
                    <span className="rounded-full bg-subtle px-1.5 text-[11px] font-semibold text-ink-muted tabular-nums sm:hidden">
                      {items.length}
                    </span>
                  )}
                </span>
                <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {items.slice(0, MAX_LINES).map((lesson) => (
                    <span key={lesson.id} className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-muted">
                      <span
                        aria-hidden
                        className={cn("size-2 shrink-0 rounded-full", TONE_SOLID[LESSON_STATUS_META[lesson.status].tone])}
                      />
                      <span className="font-semibold tabular-nums">{formatTime(lesson.start)}</span>
                      <span className="truncate">{lesson.student.lastName}</span>
                    </span>
                  ))}
                  {items.length > MAX_LINES && (
                    <span className="text-[11px] font-semibold text-brand">
                      + {items.length - MAX_LINES} {items.length - MAX_LINES > 1 ? "autres" : "autre"}
                    </span>
                  )}
                </span>
                {onLeave && (
                  <span className="mt-auto hidden truncate text-[11px] font-medium text-ink-subtle sm:block">Congés moniteur</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
