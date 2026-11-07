"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { BookOpen, Car, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CreditCard, TriangleAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { inputStyles } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { PURCHASE_HREF } from "@/features/paiements/links";
import { cn } from "@/lib/cn";
import { formatDateLong, formatDayOfMonth, formatHours, formatMonthShort, formatTime, formatWeekdayShort } from "@/lib/format";
import { addDays } from "@/lib/paris-time";
import type { BookingWeek, LessonRequestInput, WeekSlot } from "@/lib/types";
import { INITIAL_PLANNING_STATE } from "./action-state";
import { requestLessonAction } from "./actions";

/** Rows shown before "Voir plus d'horaires" (the morning). */
const COLLAPSED_ROWS = 5;
const DURATIONS = [1, 1.5, 2];
const DURATION_LABELS: Record<number, string> = { 1: "1 h", 1.5: "1 h 30", 2: "2 h" };

/** Calendar day "2026-11-02" as an instant safe to format in Paris. */
const noon = (key: string) => `${key}T12:00:00.000Z`;
/** "2 nov." */
const dayMonth = (key: string) => `${formatDayOfMonth(noon(key))} ${formatMonthShort(noon(key))}`;

const TYPES: Array<{ value: LessonRequestInput["type"]; label: string; hint: string; icon: typeof Car }> = [
  { value: "conduite", label: "Leçon de conduite", hint: "Pratique au volant", icon: Car },
  { value: "code", label: "Leçon de code", hint: "Apprentissage théorique", icon: BookOpen },
];

const UNAVAILABLE: Record<Exclude<WeekSlot["state"], "libre">, string> = {
  pris: "déjà pris",
  passe: "délai dépassé",
  ferme: "auto-école fermée",
};

const planningHref = (week: string, type: LessonRequestInput["type"]) => `/eleve/planning?semaine=${week}&type=${type}#reserver`;

/** "Leçon de conduite" / "Leçon de code": links, the grid depends on the type (a vehicle or not). */
export function LessonTypeSwitch({ week, type }: { week: string; type: LessonRequestInput["type"] }) {
  return (
    <nav aria-label="Type de rendez-vous" className="grid gap-3 sm:grid-cols-2">
      {TYPES.map((item) => {
        const selected = item.value === type;
        return (
          <Link
            key={item.value}
            href={planningHref(week, item.value)}
            scroll={false}
            aria-current={selected ? "true" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 p-4 transition-colors",
              selected ? "border-brand bg-brand-soft/60" : "border-line bg-surface hover:border-line-strong",
            )}
          >
            <item.icon className={cn("size-5 shrink-0", selected ? "text-brand" : "text-ink-subtle")} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{item.label}</span>
              <span className="block text-sm text-ink-muted">{item.hint}</span>
            </span>
            <span
              aria-hidden
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                selected ? "border-brand bg-brand" : "border-line-strong",
              )}
            >
              {selected && <span className="size-2 rounded-full bg-on-brand" />}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Week of the referent's agenda: green cells can be requested, grey ones are taken, too close or
 * closed. A cell opens the "Vérifiez votre demande" dialog.
 */
export function WeekBooking({ week, type }: { week: BookingWeek; type: LessonRequestInput["type"] }) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<{ day: number; row: number } | null>(null);
  // A new key per opening resets the dialog's form (no stale error from a previous slot).
  const [openings, setOpenings] = useState(0);

  const firstFreeRow = Math.min(
    ...week.days.map((d) => {
      const index = d.slots.findIndex((s) => s.state === "libre");
      return index === -1 ? Infinity : index;
    }),
  );
  // Show everything when the morning has nothing free.
  const showAll = expanded || firstFreeRow >= COLLAPSED_ROWS;
  const rows = showAll ? week.hours : week.hours.slice(0, COLLAPSED_ROWS);
  const lastDay = week.days[week.days.length - 1].date;
  const previous = week.weekStart > week.firstWeekStart ? addDays(week.weekStart, -7) : null;
  const next = week.weekStart < week.lastWeekStart ? addDays(week.weekStart, 7) : null;
  const typeLabel = type === "code" ? "Code" : "Conduite";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <WeekArrow href={previous && planningHref(previous, type)} direction="previous" />
        <div className="text-center">
          <p className="font-bold text-ink">
            {formatWeekdayShort(noon(week.weekStart))} {dayMonth(week.weekStart)} — {formatWeekdayShort(noon(lastDay))}{" "}
            {dayMonth(lastDay)}
          </p>
          <p className="text-xs text-ink-subtle">Heure de Paris · {typeLabel}</p>
        </div>
        <WeekArrow href={next && planningHref(next, type)} direction="next" />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[19rem] table-fixed border-separate border-spacing-1 sm:border-spacing-1.5">
          <caption className="sr-only">
            Créneaux de {week.instructor.firstName} {week.instructor.lastName} du {formatDateLong(noon(week.weekStart))} au{" "}
            {formatDateLong(noon(lastDay))}. Les créneaux libres peuvent être demandés.
          </caption>
          <thead>
            <tr>
              {week.days.map((day) => (
                <th key={day.date} scope="col" className="pb-1 text-center font-normal">
                  <span className="block text-xs font-bold text-ink capitalize sm:text-sm">{formatWeekdayShort(noon(day.date))}</span>
                  <span className="block text-[11px] text-ink-subtle">{dayMonth(day.date)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((hour, row) => (
              <tr key={hour}>
                {week.days.map((day, dayIndex) => {
                  const slot = day.slots[row];
                  const end = `${String(Number(hour.slice(0, 2)) + 1).padStart(2, "0")}:00`;
                  if (slot.state === "libre") {
                    return (
                      <td key={day.date}>
                        <button
                          type="button"
                          aria-haspopup="dialog"
                          onClick={() => {
                            setSelected({ day: dayIndex, row });
                            setOpenings((n) => n + 1);
                          }}
                          className="flex h-12 w-full flex-col items-center justify-center rounded-xl border-[1.5px] border-brand/60 bg-brand-soft/50 text-brand transition-colors hover:border-brand hover:bg-brand-soft sm:h-14"
                        >
                          <span className="text-sm font-bold tabular-nums">{hour}</span>
                          <span className="hidden text-[11px] text-brand/80 tabular-nums sm:block">{end}</span>
                          <span className="sr-only">
                            , {formatDateLong(noon(day.date))}, libre : demander ce créneau
                          </span>
                        </button>
                      </td>
                    );
                  }
                  return (
                    <td key={day.date}>
                      <span className="flex h-12 w-full flex-col items-center justify-center rounded-xl bg-subtle text-ink-subtle/70 sm:h-14">
                        <span className="text-sm font-semibold tabular-nums line-through decoration-ink-subtle/40">{hour}</span>
                        <span className="sr-only">
                          , {formatDateLong(noon(day.date))} : {UNAVAILABLE[slot.state]}
                        </span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {firstFreeRow < COLLAPSED_ROWS && week.hours.length > COLLAPSED_ROWS && (
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={showAll}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
          >
            {showAll ? "Réduire les horaires" : "Voir plus d'horaires"}
            {showAll ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
          </button>
        </div>
      )}

      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded border-[1.5px] border-brand/60 bg-brand-soft/50" /> Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded bg-subtle" /> Déjà pris ou indisponible
        </span>
      </p>

      {selected && (
        <RequestDialog
          key={openings}
          week={week}
          type={type}
          day={selected.day}
          row={selected.row}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function WeekArrow({ href, direction }: { href: string | null; direction: "previous" | "next" }) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const label = direction === "previous" ? "Semaine précédente" : "Semaine suivante";
  const classes = "flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface";
  if (!href) {
    return (
      <span className={cn(classes, "text-ink-subtle/40")} aria-hidden>
        <Icon className="size-5" />
      </span>
    );
  }
  return (
    <Link href={href} scroll={false} aria-label={label} className={cn(classes, "text-ink hover:bg-subtle")}>
      <Icon className="size-5" aria-hidden />
    </Link>
  );
}

/** "Vérifiez votre demande": start time, duration (only what fits in the free cells), quota, send. */
function RequestDialog({
  week,
  type,
  day,
  row,
  onClose,
}: {
  week: BookingWeek;
  type: LessonRequestInput["type"];
  day: number;
  row: number;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(requestLessonAction, INITIAL_PLANNING_STATE);
  const slots = week.days[day].slots;
  const start = slots[row].start;
  // 1 h needs this cell; 1 h 30 and 2 h also need the next one.
  const durations = DURATIONS.filter((d) => d <= 1 || slots[row + 1]?.state === "libre");
  const [duration, setDuration] = useState(String(durations.includes(2) && type === "conduite" ? 2 : 1));
  const endOf = (hours: number) => formatTime(new Date(Date.parse(start) + hours * 3_600_000).toISOString());
  const { rules, booked } = week;
  const typeMeta = TYPES.find((t) => t.value === type)!;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Vérifiez votre demande"
      description={`${formatDateLong(start)} · ${week.instructor.firstName} ${week.instructor.lastName}`}
    >
      <form key={state.attempt ?? 0} action={formAction} className="space-y-4">
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="start" value={start} />
        <input type="hidden" name="weekStart" value={week.weekStart} />

        <p className="flex items-center gap-2 rounded-2xl bg-brand-soft/70 px-4 py-3 font-semibold text-brand">
          <typeMeta.icon className="size-5" aria-hidden />
          {typeMeta.label}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink">Heure de début</p>
            <p className={cn(inputStyles, "flex items-center bg-subtle tabular-nums")}>{formatTime(start)}</p>
          </div>
          <div>
            <label htmlFor="duree" className="mb-1.5 block text-sm font-semibold text-ink">
              Heure de fin
            </label>
            <select
              id="duree"
              name="duration"
              className={inputStyles}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            >
              {durations.map((d) => (
                <option key={d} value={d}>
                  {endOf(d)} · {DURATION_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm text-ink-muted">
          Cette semaine : {booked.lessons} / {rules.maxLessonsPerWeek} rendez-vous · {formatHours(booked.hours)} /{" "}
          {formatHours(rules.maxHoursPerWeek)}.
        </p>

        {state.status === "error" && (
          <Alert
            tone="danger"
            role="alert"
            icon={TriangleAlert}
            action={
              state.code === "solde_insuffisant" ? (
                <ButtonLink href={PURCHASE_HREF} variant="secondary" icon={<CreditCard className="size-4" aria-hidden />}>
                  Recharger mon solde
                </ButtonLink>
              ) : undefined
            }
          >
            {state.message}
          </Alert>
        )}

        <p className="text-xs text-ink-subtle">Votre demande sera soumise à la confirmation de votre moniteur.</p>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Retour
          </Button>
          {state.code === "solde_insuffisant" && (
            <SubmitButton name="acceptPendingPayment" value="1" variant="secondary" pendingLabel="Envoi…">
              Envoyer quand même
            </SubmitButton>
          )}
          <SubmitButton name="acceptPendingPayment" value="0" pendingLabel="Envoi…">
            Demander ce rendez-vous
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
