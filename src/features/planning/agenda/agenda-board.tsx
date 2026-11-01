"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TONE_SOLID } from "@/components/ui/tone";
import { cn } from "@/lib/cn";
import { dayKey, formatDateLong, formatTime, formatWeekdayShort, initials } from "@/lib/format";
import { addDays, parisDateTime } from "@/lib/paris-time";
import type { Leave, Planning, PlanningLesson } from "@/lib/types";
import { LESSON_STATUS_META } from "../lesson-meta";
import { moveLessonAction } from "./actions";
import { AgendaList } from "./agenda-list";
import {
  AGENDA_VIEWS,
  ALL_INSTRUCTORS,
  agendaDays,
  agendaHref,
  agendaTitle,
  noonOf,
  shiftedDate,
  type AgendaQuery,
} from "./agenda-range";
import { LessonFormDialog, type LessonFormMode, type StudentChoice } from "./lesson-form";
import { LessonPanel } from "./lesson-panel";
import { MonthGrid } from "./month-grid";
import { TimeGrid, type GridColumn, type GridTarget } from "./time-grid";

type AgendaBoardProps = {
  query: AgendaQuery;
  todayKey: string;
  planning: Planning;
  students: StudentChoice[];
  permissions: { canManage: boolean; canForce: boolean; canSeeStudents: boolean };
};

type Feedback = { tone: "success" | "danger"; message: string; id: number };

const chip = (active: boolean) =>
  cn(
    "inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors",
    active ? "bg-brand text-on-brand shadow-sm" : "border border-line bg-surface text-ink-muted hover:bg-subtle hover:text-ink",
  );

const isMovable = (now: string) => (lesson: PlanningLesson) =>
  (lesson.status === "confirme" || lesson.status === "attente_paiement") && lesson.start > now;

/** Staff planning: day, week and month views, lesson panel, creation and drag-and-drop moves. */
export function AgendaBoard({ query, todayKey, planning, students, permissions }: AgendaBoardProps) {
  const { now, instructors, vehicles, lessons, leaves } = planning;
  const { canManage, canForce, canSeeStudents } = permissions;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<{ key: number; mode: LessonFormMode } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [moveConflict, setMoveConflict] = useState<{
    lessonId: string;
    start: string;
    instructorId: string;
    conflicts: string[];
  } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isMoving, startMove] = useTransition();

  const filterId = instructors.some((i) => i.id === query.instructor) ? query.instructor : ALL_INSTRUCTORS;
  const visibleInstructors = filterId === ALL_INSTRUCTORS ? instructors : instructors.filter((i) => i.id === filterId);
  const visibleLessons = filterId === ALL_INSTRUCTORS ? lessons : lessons.filter((l) => l.instructor.id === filterId);
  const visibleLeaves = filterId === ALL_INSTRUCTORS ? leaves : leaves.filter((l) => l.instructorId === filterId);
  const days = agendaDays(query);
  const selected = lessons.find((l) => l.id === selectedId) ?? null;
  const href = (patch: Partial<AgendaQuery>) => agendaHref({ ...query, instructor: filterId, ...patch });
  const instructorName = (id: string) => {
    const i = instructors.find((x) => x.id === id);
    return i ? `${i.firstName} ${i.lastName}` : "";
  };

  const leavesOn = (day: string, instructorId?: string): Leave[] => {
    const start = parisDateTime(day).getTime();
    const end = parisDateTime(addDays(day, 1)).getTime();
    return visibleLeaves.filter(
      (l) => (!instructorId || l.instructorId === instructorId) && Date.parse(l.start) < end && Date.parse(l.end) > start,
    );
  };

  function show(tone: Feedback["tone"], message: string) {
    setFeedback((previous) => ({ tone, message, id: (previous?.id ?? 0) + 1 }));
  }

  function openCreate(target?: GridTarget) {
    const day = target?.dayKey ?? (query.date < todayKey ? todayKey : query.view === "mois" ? todayKey : query.date);
    setForm((previous) => ({
      key: (previous?.key ?? 0) + 1,
      mode: {
        kind: "create",
        dayKey: day,
        minutes: target?.minutes ?? 8 * 60,
        instructorId: target?.instructorId ?? (filterId === ALL_INSTRUCTORS ? undefined : filterId),
      },
    }));
    setFormOpen(true);
  }

  function openEdit(lessonId: string) {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    setPanelOpen(false);
    setForm((previous) => ({ key: (previous?.key ?? 0) + 1, mode: { kind: "edit", lesson } }));
    setFormOpen(true);
  }

  function move(lessonId: string, start: string, instructorId: string, force: boolean) {
    startMove(async () => {
      const result = await moveLessonAction(lessonId, start, instructorId, force);
      if (result.status === "success") {
        setMoveConflict(null);
        show("success", result.message ?? "RDV déplacé.");
      } else if (result.code === "conflit") {
        setMoveConflict({ lessonId, start, instructorId, conflicts: result.conflicts ?? [] });
      } else {
        setMoveConflict(null);
        show("danger", result.message ?? "Ce déplacement n'est pas possible.");
      }
    });
  }

  function handleDrop(lessonId: string, target: GridTarget) {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    const start = parisDateTime(target.dayKey, Math.floor(target.minutes / 60), target.minutes % 60).toISOString();
    const instructorId = target.instructorId ?? lesson.instructor.id;
    if (start === lesson.start && instructorId === lesson.instructor.id) return;
    move(lessonId, start, instructorId, false);
  }

  const columns: GridColumn[] =
    query.view === "jour"
      ? visibleInstructors.map((instructor) => {
          const dayLeaves = leavesOn(query.date, instructor.id);
          return {
            key: instructor.id,
            dayKey: query.date,
            instructorId: instructor.id,
            isToday: query.date === todayKey,
            lessons: visibleLessons.filter((l) => l.instructor.id === instructor.id && dayKey(l.start) === query.date),
            leaves: dayLeaves,
            header: (
              <span className="flex items-center justify-center gap-2">
                <Avatar initials={initials(instructor.firstName, instructor.lastName)} size="sm" />
                <span className="truncate text-sm font-bold text-ink">
                  {instructor.firstName} {instructor.lastName}
                </span>
              </span>
            ),
          };
        })
      : days.map((day) => {
          const dayLeaves = leavesOn(day);
          return {
            key: day,
            dayKey: day,
            instructorId: filterId === ALL_INSTRUCTORS ? undefined : filterId,
            isToday: day === todayKey,
            lessons: visibleLessons.filter((l) => dayKey(l.start) === day),
            leaves: filterId === ALL_INSTRUCTORS ? [] : dayLeaves,
            header: (
              <Link href={href({ view: "jour", date: day })} className="block rounded-lg py-0.5 hover:bg-subtle">
                <span className="block text-[11px] font-semibold text-ink-subtle uppercase">{formatWeekdayShort(noonOf(day))}</span>
                <span className={cn("text-lg font-bold tabular-nums", day === todayKey ? "text-brand" : "text-ink")}>
                  {Number(day.slice(8))}
                </span>
                {filterId === ALL_INSTRUCTORS && dayLeaves.length > 0 && (
                  <span className="block truncate text-[11px] font-medium text-ink-subtle">
                    {dayLeaves.map((l) => instructorName(l.instructorId).split(" ")[0]).join(", ")} : congés
                  </span>
                )}
              </Link>
            ),
          };
        });

  const conflictLesson = moveConflict ? lessons.find((l) => l.id === moveConflict.lessonId) : null;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href={href({ date: todayKey })} variant="secondary" size="sm">
            Aujourd&apos;hui
          </ButtonLink>
          <div className="flex items-center">
            <Link
              href={href({ date: shiftedDate(query, -1) })}
              aria-label="Période précédente"
              className="flex size-10 items-center justify-center rounded-xl text-ink-muted hover:bg-subtle hover:text-ink"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Link>
            <Link
              href={href({ date: shiftedDate(query, 1) })}
              aria-label="Période suivante"
              className="flex size-10 items-center justify-center rounded-xl text-ink-muted hover:bg-subtle hover:text-ink"
            >
              <ChevronRight className="size-5" aria-hidden />
            </Link>
          </div>
          <h2 className="text-lg font-bold text-ink sm:text-xl">{agendaTitle(query)}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Vue du planning" className="inline-flex rounded-xl border border-line bg-surface p-1">
            {AGENDA_VIEWS.map(({ view, label }) => (
              <Link
                key={view}
                href={href({ view })}
                aria-current={query.view === view ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-semibold transition-colors",
                  query.view === view ? "bg-brand-soft text-brand" : "text-ink-muted hover:text-ink",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          {canManage && (
            <Button size="md" onClick={() => openCreate()} icon={<CalendarPlus className="size-4" aria-hidden />} aria-haspopup="dialog">
              Nouveau RDV
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Moniteurs" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-2">
            <li>
              <Link href={href({ instructor: ALL_INSTRUCTORS })} aria-current={filterId === ALL_INSTRUCTORS ? "true" : undefined} className={chip(filterId === ALL_INSTRUCTORS)}>
                Tous les moniteurs
              </Link>
            </li>
            {instructors.map((instructor) => (
              <li key={instructor.id}>
                <Link
                  href={href({ instructor: instructor.id })}
                  aria-current={filterId === instructor.id ? "true" : undefined}
                  className={chip(filterId === instructor.id)}
                >
                  {instructor.firstName} {instructor.lastName}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <ul aria-label="Légende des statuts" className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-ink-muted">
          {Object.entries(LESSON_STATUS_META).map(([status, meta]) => (
            <li key={status} className="flex items-center gap-1.5">
              <span aria-hidden className={cn("size-2.5 rounded-full", TONE_SOLID[meta.tone])} />
              {meta.label}
            </li>
          ))}
        </ul>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {feedback && (
          <Alert key={feedback.id} tone={feedback.tone} className="mb-4" role={feedback.tone === "danger" ? "alert" : "status"}>
            {feedback.message}
          </Alert>
        )}
      </div>

      {canManage && query.view !== "mois" && (
        <p className="mb-3 hidden text-sm text-ink-subtle md:block">
          Cliquez sur un créneau libre pour créer un RDV, ou faites glisser un RDV pour le déplacer.
        </p>
      )}

      <div aria-busy={isMoving || undefined}>
        {query.view === "mois" ? (
          <MonthGrid
            days={days}
            month={query.date.slice(0, 7)}
            todayKey={todayKey}
            lessons={visibleLessons}
            leaves={visibleLeaves}
            dayHref={(day) => href({ view: "jour", date: day })}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <TimeGrid
                columns={columns}
                now={now}
                showInstructor={query.view === "semaine" && filterId === ALL_INSTRUCTORS}
                canManage={canManage}
                isMovable={isMovable(now)}
                onSelect={(id) => {
                  setSelectedId(id);
                  setPanelOpen(true);
                }}
                onCreateAt={openCreate}
                onMove={handleDrop}
              />
            </div>
            <div className="md:hidden">
              <AgendaList
                days={days}
                now={now}
                lessons={visibleLessons}
                leaves={visibleLeaves}
                instructors={instructors}
                onSelect={(id) => {
                  setSelectedId(id);
                  setPanelOpen(true);
                }}
              />
            </div>
          </>
        )}
      </div>

      <LessonPanel
        key={selected?.id ?? "aucun"}
        lesson={selected}
        open={panelOpen && selected !== null}
        onClose={() => setPanelOpen(false)}
        now={now}
        canManage={canManage}
        canSeeStudents={canSeeStudents}
        onEdit={openEdit}
        onDone={(message) => {
          setPanelOpen(false);
          show("success", message);
        }}
      />

      {form && (
        <LessonFormDialog
          key={form.key}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          mode={form.mode}
          students={students}
          instructors={instructors}
          vehicles={vehicles}
          canForce={canForce}
          onSaved={(message) => {
            setFormOpen(false);
            show("success", message);
          }}
        />
      )}

      <Dialog
        open={moveConflict !== null}
        onClose={() => setMoveConflict(null)}
        title="Déplacement impossible"
        description={
          conflictLesson && moveConflict
            ? `${conflictLesson.student.firstName} ${conflictLesson.student.lastName} — ${formatDateLong(moveConflict.start)} à ${formatTime(moveConflict.start)}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setMoveConflict(null)}>
              Laisser le RDV en place
            </Button>
            {canForce && moveConflict && (
              <Button
                variant="danger"
                loading={isMoving}
                onClick={() => move(moveConflict.lessonId, moveConflict.start, moveConflict.instructorId, true)}
              >
                Forcer le déplacement
              </Button>
            )}
          </>
        }
      >
        <Alert tone="danger" icon={TriangleAlert} title="Conflit sur ce créneau">
          <ul className="list-disc space-y-1 pl-4">
            {moveConflict?.conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}
          </ul>
          {!canForce && <p className="mt-2">Seul le gérant peut forcer un RDV en conflit.</p>}
        </Alert>
      </Dialog>
    </div>
  );
}
