"use client";

import { CalendarOff, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TONE_SOLID } from "@/components/ui/tone";
import { cn } from "@/lib/cn";
import { dayKey, formatRelativeDay, formatTimeRange } from "@/lib/format";
import type { Instructor, Leave, PlanningLesson } from "@/lib/types";
import { LESSON_STATUS_META, LESSON_TYPE_META } from "../lesson-meta";
import { noonOf } from "./agenda-range";

type AgendaListProps = {
  days: string[];
  now: string;
  lessons: PlanningLesson[];
  leaves: Leave[];
  instructors: Instructor[];
  onSelect: (lessonId: string) => void;
};

/** Day and week views on a phone: one list per day instead of the hour grid. */
export function AgendaList({ days, now, lessons, leaves, instructors, onSelect }: AgendaListProps) {
  const nameOf = (id: string) => {
    const i = instructors.find((x) => x.id === id);
    return i ? `${i.firstName} ${i.lastName}` : "";
  };

  return (
    <div className="space-y-6">
      {days.map((day) => {
        const items = lessons.filter((l) => dayKey(l.start) === day);
        const dayLeaves = leaves.filter(
          (l) => dayKey(l.start) <= day && dayKey(new Date(Date.parse(l.end) - 1).toISOString()) >= day,
        );
        return (
          <section key={day} aria-labelledby={`jour-${day}`}>
            <h3 id={`jour-${day}`} className="mb-2 text-sm font-bold text-ink">
              {formatRelativeDay(noonOf(day), now)}
            </h3>
            {dayLeaves.map((leave) => (
              <p key={leave.id} className="mb-2 flex items-center gap-2 text-sm text-ink-muted">
                <CalendarOff className="size-4 shrink-0 text-ink-subtle" aria-hidden />
                {nameOf(leave.instructorId)} : {leave.reason.toLowerCase()}
              </p>
            ))}
            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-subtle">Aucun RDV</p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
                {items.map((lesson) => {
                  const status = LESSON_STATUS_META[lesson.status];
                  const type = LESSON_TYPE_META[lesson.type];
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(lesson.id)}
                        className="relative flex w-full items-center gap-3 py-3 pr-3 pl-4 text-left hover:bg-subtle"
                      >
                        <span aria-hidden className={cn("absolute inset-y-2 left-0 w-1 rounded-r", TONE_SOLID[status.tone])} />
                        <span className="w-24 shrink-0 text-sm font-semibold text-ink tabular-nums">
                          {formatTimeRange(lesson.start, lesson.end)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate font-semibold text-ink", lesson.status === "annule" && "line-through")}>
                            {lesson.student.firstName} {lesson.student.lastName}
                          </span>
                          <span className="block truncate text-sm text-ink-muted">
                            {type.label} · {lesson.instructor.firstName} {lesson.instructor.lastName}
                          </span>
                          <span className="mt-1 block">
                            <Badge tone={status.tone} icon={status.icon}>
                              {status.label}
                            </Badge>
                          </span>
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-ink-subtle" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
