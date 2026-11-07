"use client";

import { useRef, useState, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { TONE_SOLID } from "@/components/ui/tone";
import { cn } from "@/lib/cn";
import { dayKey, formatTime, formatTimeRange, initials } from "@/lib/format";
import { parisMinutes } from "@/lib/paris-time";
import type { Leave, LessonStatus, PlanningLesson } from "@/lib/types";
import { LESSON_STATUS_META, LESSON_TYPE_META } from "../lesson-meta";

export const GRID_START_HOUR = 7;
export const GRID_END_HOUR = 21;
const HOUR_PX = 56;
const SNAP_MINUTES = 30;
const GRID_START = GRID_START_HOUR * 60;
const GRID_END = GRID_END_HOUR * 60;
const GRID_HEIGHT = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_PX;

export type GridColumn = {
  key: string;
  dayKey: string;
  /** Set in the day view (one column per instructor): creating or dropping here uses this instructor. */
  instructorId?: string;
  header: ReactNode;
  isToday: boolean;
  lessons: PlanningLesson[];
  /** Leaves drawn as hatched blocks (only when the column belongs to one instructor). */
  leaves: Leave[];
};

export type GridTarget = { dayKey: string; minutes: number; instructorId?: string };

type TimeGridProps = {
  columns: GridColumn[];
  now: string;
  /** Show the instructor's initials on each lesson (week view with every instructor). */
  showInstructor: boolean;
  canManage: boolean;
  isMovable: (lesson: PlanningLesson) => boolean;
  onSelect: (lessonId: string) => void;
  onCreateAt: (target: GridTarget) => void;
  onMove: (lessonId: string, target: GridTarget) => void;
};

/** Lesson colors by status, shared with the legend. Text stays ink for contrast. */
export const STATUS_BLOCK: Record<LessonStatus, string> = {
  a_confirmer: "bg-brand-soft border-dashed border-brand/50",
  confirme: "bg-info-soft border-info/30",
  effectue: "bg-success-soft border-success/30",
  annule: "bg-subtle border-line text-ink-subtle",
  attente_paiement: "bg-warning-soft border-warning/40",
};

const toPx = (minutes: number) => ((Math.min(Math.max(minutes, GRID_START), GRID_END) - GRID_START) / 60) * HOUR_PX;
const snap = (minutes: number) => Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;

/** Side-by-side columns for overlapping lessons: index and count per lesson id. */
function overlapLayout(lessons: PlanningLesson[]): Map<string, { index: number; count: number }> {
  const sorted = [...lessons].sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end));
  const result = new Map<string, { index: number; count: number }>();
  let cluster: Array<{ id: string; index: number }> = [];
  let columnsEnd: string[] = [];
  let clusterEnd = "";

  // A cluster is a chain of overlapping lessons; they all share its column count.
  const flush = () => {
    for (const item of cluster) result.set(item.id, { index: item.index, count: columnsEnd.length });
    cluster = [];
    columnsEnd = [];
    clusterEnd = "";
  };

  for (const lesson of sorted) {
    if (cluster.length > 0 && lesson.start >= clusterEnd) flush();
    let index = columnsEnd.findIndex((end) => end <= lesson.start);
    if (index === -1) {
      index = columnsEnd.length;
      columnsEnd.push(lesson.end);
    } else {
      columnsEnd[index] = lesson.end;
    }
    cluster.push({ id: lesson.id, index });
    if (lesson.end > clusterEnd) clusterEnd = lesson.end;
  }
  flush();
  return result;
}

const HOUR_LINES = {
  backgroundImage: [
    `repeating-linear-gradient(to bottom, var(--color-line) 0 1px, transparent 1px ${HOUR_PX}px)`,
    `repeating-linear-gradient(to bottom, transparent 0 ${HOUR_PX / 2}px, color-mix(in oklab, var(--color-line) 55%, transparent) ${HOUR_PX / 2}px ${HOUR_PX / 2 + 1}px, transparent ${HOUR_PX / 2 + 1}px ${HOUR_PX}px)`,
  ].join(","),
};

const HATCH = {
  backgroundImage:
    "repeating-linear-gradient(135deg, color-mix(in oklab, var(--color-ink-subtle) 18%, transparent) 0 6px, transparent 6px 12px)",
};

/** Hour-by-hour grid for the day and week views. Mouse shortcuts (click, drag) all have a button alternative. */
export function TimeGrid({ columns, now, showInstructor, canManage, isMovable, onSelect, onCreateAt, onMove }: TimeGridProps) {
  const dragging = useRef<{ id: string; duration: number; grabOffset: number } | null>(null);
  const [preview, setPreview] = useState<{ column: string; minutes: number; duration: number } | null>(null);
  const nowMinutes = parisMinutes(now);
  const template = { gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(0, 1fr))` };

  const minutesAt = (event: { clientY: number; currentTarget: HTMLElement }) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return GRID_START + ((event.clientY - rect.top) / HOUR_PX) * 60;
  };

  function handleLaneClick(event: MouseEvent<HTMLDivElement>, column: GridColumn) {
    if (!canManage || event.target !== event.currentTarget) return;
    const minutes = Math.min(snap(minutesAt(event) - 15), GRID_END - 60);
    onCreateAt({ dayKey: column.dayKey, minutes, instructorId: column.instructorId });
  }

  function dropMinutes(event: DragEvent<HTMLDivElement>) {
    const drag = dragging.current;
    if (!drag) return null;
    const minutes = snap(minutesAt(event) - drag.grabOffset);
    return Math.min(Math.max(minutes, GRID_START), GRID_END - drag.duration);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
      <div className="min-w-[44rem]">
        <div className="grid border-b border-line" style={template}>
          <div />
          {columns.map((column) => (
            <div
              key={column.key}
              className={cn("border-l border-line px-2 py-2.5 text-center", column.isToday && "bg-brand-soft")}
            >
              {column.header}
            </div>
          ))}
        </div>

        <div className="grid" style={template}>
          <div aria-hidden className="relative" style={{ height: GRID_HEIGHT }}>
            {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => (
              <span
                key={i}
                className="absolute right-2 -translate-y-1/2 text-[11px] font-medium text-ink-subtle tabular-nums first:translate-y-0"
                style={{ top: i * HOUR_PX }}
              >
                {String(GRID_START_HOUR + i).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {columns.map((column) => {
            const layout = overlapLayout(column.lessons);
            return (
              <div
                key={column.key}
                className={cn("relative border-l border-line", canManage && "cursor-cell", column.isToday && "bg-brand-soft/40")}
                style={{ ...HOUR_LINES, height: GRID_HEIGHT }}
                onClick={(event) => handleLaneClick(event, column)}
                onDragOver={(event) => {
                  const minutes = dropMinutes(event);
                  if (minutes === null) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setPreview({ column: column.key, minutes, duration: dragging.current!.duration });
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                  setPreview(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const minutes = dropMinutes(event);
                  const drag = dragging.current;
                  setPreview(null);
                  dragging.current = null;
                  if (minutes === null || !drag) return;
                  onMove(drag.id, { dayKey: column.dayKey, minutes, instructorId: column.instructorId });
                }}
              >
                {column.leaves.map((leave) => {
                  const top = dayKey(leave.start) < column.dayKey ? 0 : toPx(parisMinutes(leave.start));
                  const bottom = dayKey(leave.end) > column.dayKey ? GRID_HEIGHT : toPx(parisMinutes(leave.end));
                  return (
                    <div
                      key={leave.id}
                      className="pointer-events-none absolute inset-x-0 flex items-start justify-center pt-3"
                      style={{ ...HATCH, top, height: Math.max(bottom - top, HOUR_PX / 2) }}
                    >
                      <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted shadow-card">
                        {leave.reason}
                      </span>
                    </div>
                  );
                })}

                {column.isToday && nowMinutes > GRID_START && nowMinutes < GRID_END && (
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 z-20" style={{ top: toPx(nowMinutes) }}>
                    <div className="h-0.5 bg-danger" />
                    <div className="absolute -top-1 -left-1 size-2.5 rounded-full bg-danger" />
                  </div>
                )}

                {preview?.column === column.key && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-1 z-10 rounded-lg border-2 border-dashed border-brand bg-brand-soft/60"
                    style={{ top: toPx(preview.minutes), height: (preview.duration / 60) * HOUR_PX }}
                  />
                )}

                {column.lessons.map((lesson) => {
                  const start = parisMinutes(lesson.start);
                  const duration = lesson.durationHours * 60;
                  const top = toPx(start);
                  const height = Math.max(toPx(start + duration) - top, 24);
                  const { index, count } = layout.get(lesson.id) ?? { index: 0, count: 1 };
                  const status = LESSON_STATUS_META[lesson.status];
                  const type = LESSON_TYPE_META[lesson.type];
                  const movable = canManage && isMovable(lesson);
                  const student = `${lesson.student.firstName} ${lesson.student.lastName}`;
                  // Side-by-side lessons are narrow: start time and "L. Fontaine" only.
                  const narrow = count > 1;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      draggable={movable}
                      onDragStart={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        dragging.current = {
                          id: lesson.id,
                          duration,
                          grabOffset: snap(((event.clientY - rect.top) / HOUR_PX) * 60),
                        };
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", lesson.id);
                      }}
                      onDragEnd={() => {
                        dragging.current = null;
                        setPreview(null);
                      }}
                      onClick={() => onSelect(lesson.id)}
                      aria-label={`${type.label}, ${formatTimeRange(lesson.start, lesson.end)}, ${student}, avec ${lesson.instructor.firstName} ${lesson.instructor.lastName}, ${status.label}`}
                      className={cn(
                        "absolute z-10 flex flex-col overflow-hidden rounded-lg border py-1 pr-1.5 pl-2.5 text-left text-ink transition-shadow hover:shadow-raised",
                        STATUS_BLOCK[lesson.status],
                        movable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                        lesson.status === "annule" && "opacity-70",
                      )}
                      style={{
                        top: top + 1,
                        height: height - 2,
                        left: `calc(${(index / count) * 100}% + 2px)`,
                        width: `calc(${100 / count}% - 4px)`,
                      }}
                    >
                      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", TONE_SOLID[status.tone])} />
                      <span className="flex items-center justify-between gap-1 text-[11px] font-semibold text-ink-muted tabular-nums">
                        <span className="truncate">
                          {narrow ? formatTime(lesson.start) : formatTimeRange(lesson.start, lesson.end)}
                        </span>
                        <status.icon className="size-3.5 shrink-0" aria-hidden />
                      </span>
                      <span className={cn("truncate text-xs font-bold", lesson.status === "annule" && "line-through")}>
                        {narrow ? `${lesson.student.firstName.charAt(0)}. ${lesson.student.lastName}` : student}
                      </span>
                      {height > 60 && (
                        <span className="mt-auto flex min-w-0 items-center gap-1 text-[11px] text-ink-muted">
                          <type.icon className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{narrow ? "" : lesson.vehicle ? lesson.vehicle.label : type.label}</span>
                          {showInstructor && (
                            <span className="ml-auto shrink-0 rounded bg-surface/80 px-1 font-semibold text-ink-muted">
                              {initials(lesson.instructor.firstName, lesson.instructor.lastName)}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
