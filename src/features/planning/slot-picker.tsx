"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarSearch, ChevronRight, MapPin, UsersRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import {
  dayKey,
  formatDateLong,
  formatDayOfMonth,
  formatHours,
  formatTime,
  formatWeekdayShort,
  initials,
} from "@/lib/format";
import type { Instructor, Slot } from "@/lib/types";
import { BookingDialog } from "./booking-dialog";
import { nextDays } from "./dates";

const DAYS_AHEAD = 14;
const ALL = "tous";

type SlotPickerProps = {
  /** Server time (ISO): the day strip starts the day after. */
  now: string;
  slots: Slot[];
  referent: Instructor;
  restrictedToReferent: boolean;
  /** Balance after the reservations already made, from the API. */
  hoursAfterReservations: number;
};

const fullName = (instructor: Instructor) => `${instructor.firstName} ${instructor.lastName}`;
const slotsLabel = (count: number) => `${count} créneau${count > 1 ? "x" : ""}`;

/** "Matin" / "Après-midi" / "Soir", from the Paris start time. */
function periodOf(slot: Slot): string {
  const hour = Number(formatTime(slot.start).slice(0, 2));
  if (hour < 12) return "Matin";
  if (hour < 18) return "Après-midi";
  return "Soir";
}

/**
 * Booking flow: instructor filter, 14-day strip (scrollable on mobile, 7-column grid from `sm`),
 * free slots of the selected day, then a confirmation dialog.
 */
export function SlotPicker({ now, slots, referent, restrictedToReferent, hoursAfterReservations }: SlotPickerProps) {
  const [instructorId, setInstructorId] = useState<string>(ALL);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; slot: Slot | null; key: number }>({
    open: false,
    slot: null,
    key: 0,
  });
  const stripRef = useRef<HTMLDivElement>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);

  // Referent first, then the other instructors who have free slots.
  const instructors = useMemo(() => {
    const others = new Map<string, Instructor>();
    for (const slot of slots) {
      if (slot.instructor.id !== referent.id) others.set(slot.instructor.id, slot.instructor);
    }
    return [referent, ...[...others.values()].sort((a, b) => a.lastName.localeCompare(b.lastName, "fr"))];
  }, [slots, referent]);

  const selectedInstructor = instructors.find((instructor) => instructor.id === instructorId);

  const filtered = useMemo(
    () => (instructorId === ALL ? slots : slots.filter((slot) => slot.instructor.id === instructorId)),
    [slots, instructorId],
  );

  const days = useMemo(() => nextDays(now, DAYS_AHEAD), [now]);
  const countByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const slot of filtered) {
      const key = dayKey(slot.start);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [filtered]);

  const firstDayWithSlots = days.find((day) => (countByDay.get(day.key) ?? 0) > 0);
  const activeDay = days.find((day) => day.key === selectedDay) ?? firstDayWithSlots ?? days[0];
  const daySlots = filtered.filter((slot) => dayKey(slot.start) === activeDay.key);
  const allSlotsThatDay = slots.filter((slot) => dayKey(slot.start) === activeDay.key).length;
  const nextDayWithSlots = days.find((day) => day.key > activeDay.key && (countByDay.get(day.key) ?? 0) > 0);

  // Keep the selected chip visible in the horizontal strip (mobile).
  useEffect(() => {
    const strip = stripRef.current;
    const chip = strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!strip || !chip || strip.scrollWidth <= strip.clientWidth) return;
    const left = chip.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + chip.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
    }
  }, [activeDay.key]);

  function openSlot(slot: Slot) {
    setDialog((current) => ({ open: true, slot, key: current.key + 1 }));
  }

  function closeDialog() {
    const gone = dialog.slot && !slots.some((slot) => slot.id === dialog.slot?.id);
    setDialog((current) => ({ ...current, open: false }));
    // The slot was taken meanwhile: its button no longer exists, put the focus on the list.
    if (gone) requestAnimationFrame(() => listHeadingRef.current?.focus());
  }

  const periods = groupByPeriod(daySlots);

  return (
    <div className="space-y-6">
      {restrictedToReferent ? (
        <p className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-muted shadow-card">
          <Avatar initials={initials(referent.firstName, referent.lastName)} size="sm" />
          <span>
            Votre auto-école réserve vos leçons avec votre moniteur référent,{" "}
            <strong className="font-semibold text-ink">{fullName(referent)}</strong>.
          </span>
        </p>
      ) : (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Moniteur</legend>
          <div className="flex flex-wrap gap-2">
            {[{ id: ALL, label: "Tous", referent: false }, ...instructors.map((i) => ({ id: i.id, label: fullName(i), referent: i.id === referent.id }))].map(
              (option) => (
                <label
                  key={option.id}
                  className={cn(
                    "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-150",
                    "border-line-strong bg-surface text-ink-muted hover:border-brand/50 hover:text-ink",
                    "has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand",
                    "has-focus-visible:ring-2 has-focus-visible:ring-brand has-focus-visible:ring-offset-2",
                  )}
                >
                  <input
                    type="radio"
                    name="moniteur"
                    value={option.id}
                    checked={instructorId === option.id}
                    onChange={() => setInstructorId(option.id)}
                    className="sr-only"
                  />
                  {option.id === ALL && <UsersRound className="size-4" aria-hidden />}
                  {option.label}
                  {option.referent && <span className="text-xs font-medium opacity-80">(référent·e)</span>}
                </label>
              ),
            )}
          </div>
        </fieldset>
      )}

      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="reserver-jours" className="text-sm font-semibold text-ink">
            Jour
          </h2>
          <p id="reserver-jours-aide" className="text-xs text-ink-subtle">
            Les jours en pointillés n&apos;ont aucun créneau libre.
          </p>
        </div>
        <div
          ref={stripRef}
          role="group"
          aria-labelledby="reserver-jours"
          aria-describedby="reserver-jours-aide"
          className={cn(
            "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pt-1 pb-2",
            "scrollbar-none",
            "sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0",
          )}
        >
          {days.map((day) => {
            const count = countByDay.get(day.key) ?? 0;
            const selected = day.key === activeDay.key;
            const empty = count === 0;
            return (
              <button
                key={day.key}
                type="button"
                aria-pressed={selected}
                aria-disabled={empty || undefined}
                aria-label={`${formatDateLong(day.iso)} : ${empty ? "aucun créneau libre" : `${slotsLabel(count)} libre${count > 1 ? "s" : ""}`}`}
                onClick={() => {
                  if (!empty) setSelectedDay(day.key);
                }}
                className={cn(
                  "flex w-18 shrink-0 snap-start flex-col items-center rounded-2xl border px-1 py-2.5 transition-[background-color,border-color,color,box-shadow] duration-150 sm:w-auto",
                  selected
                    ? "border-brand bg-brand text-on-brand shadow-sm"
                    : empty
                      ? "cursor-not-allowed border-dashed border-line-strong bg-transparent text-ink-subtle"
                      : "border-line bg-surface text-ink shadow-card hover:border-brand/50 hover:bg-brand-soft",
                )}
              >
                <span className="text-xs font-semibold uppercase">{formatWeekdayShort(day.iso)}</span>
                <span className="text-xl leading-tight font-bold tabular-nums">{formatDayOfMonth(day.iso)}</span>
                <span
                  className={cn(
                    "mt-0.5 text-[11px] font-medium whitespace-nowrap",
                    selected ? "text-on-brand/90" : empty ? "text-ink-subtle" : "text-brand",
                  )}
                >
                  {empty ? "Aucun" : slotsLabel(count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section aria-labelledby="reserver-creneaux">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2
            id="reserver-creneaux"
            ref={listHeadingRef}
            tabIndex={-1}
            className="rounded-md text-lg font-bold tracking-tight text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {formatDateLong(activeDay.iso)}
          </h2>
          <p className="text-sm text-ink-subtle">
            {daySlots.length > 0 ? `${slotsLabel(daySlots.length)} libre${daySlots.length > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        {/* Announces the list after a day or instructor change (the focus stays on the control). */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {`${formatDateLong(activeDay.iso)} : ${
            daySlots.length > 0
              ? `${slotsLabel(daySlots.length)} libre${daySlots.length > 1 ? "s" : ""}`
              : "aucun créneau libre"
          }${selectedInstructor ? ` avec ${fullName(selectedInstructor)}` : ""}.`}
        </p>

        {daySlots.length > 0 ? (
          <Card className="overflow-hidden">
            {periods.map(({ period, items }) => (
              <div key={period} className="border-t border-line first:border-t-0">
                <h3 className="border-b border-line bg-subtle/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-ink-subtle uppercase sm:px-5">
                  {period}
                </h3>
                <ul>
                  {items.map((slot) => (
                    <li key={slot.id} className="border-b border-line last:border-b-0">
                      <SlotRow slot={slot} isReferent={slot.instructor.id === referent.id} onChoose={openSlot} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={CalendarSearch}
              title={
                filtered.length === 0
                  ? "Aucun créneau libre sur les 14 prochains jours"
                  : "Aucun créneau libre ce jour-là"
              }
              description={
                instructorId !== ALL && allSlotsThatDay > 0
                  ? `D'autres moniteurs ont ${slotsLabel(allSlotsThatDay)} libre${allSlotsThatDay > 1 ? "s" : ""} ce jour-là.`
                  : filtered.length === 0
                    ? "De nouveaux créneaux ouvrent chaque jour. Vous pouvez aussi appeler votre auto-école."
                    : "Choisissez un autre jour dans la liste."
              }
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  {instructorId !== ALL && (
                    <Button variant="secondary" onClick={() => setInstructorId(ALL)}>
                      Voir tous les moniteurs
                    </Button>
                  )}
                  {nextDayWithSlots && (
                    <Button variant="secondary" onClick={() => setSelectedDay(nextDayWithSlots.key)}>
                      Voir le {formatDateLong(nextDayWithSlots.iso).toLowerCase()}
                    </Button>
                  )}
                </div>
              }
            />
          </Card>
        )}
      </section>

      <BookingDialog
        open={dialog.open}
        onClose={closeDialog}
        slot={dialog.slot}
        attemptKey={dialog.key}
        isReferent={dialog.slot?.instructor.id === referent.id}
        hoursAfterReservations={hoursAfterReservations}
      />
    </div>
  );
}

function groupByPeriod(slots: Slot[]) {
  const groups: Array<{ period: string; items: Slot[] }> = [];
  for (const slot of slots) {
    const period = periodOf(slot);
    const last = groups.at(-1);
    if (last?.period === period) last.items.push(slot);
    else groups.push({ period, items: [slot] });
  }
  return groups;
}

function SlotRow({ slot, isReferent, onChoose }: { slot: Slot; isReferent: boolean; onChoose: (slot: Slot) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChoose(slot)}
      aria-haspopup="dialog"
      aria-label={`Choisir le créneau de ${formatTime(slot.start)} à ${formatTime(slot.end)} avec ${fullName(slot.instructor)}, rendez-vous : ${slot.meetingPoint}`}
      className="group flex w-full items-center gap-3 px-4 py-4 text-left sm:gap-4 transition-colors duration-150 hover:bg-brand-soft/60 focus-visible:-outline-offset-2 sm:px-5"
    >
      <span className="w-19 shrink-0 whitespace-nowrap sm:w-21">
        <span className="block text-lg leading-tight font-bold text-ink tabular-nums">{formatTime(slot.start)}</span>
        <span className="block text-sm text-ink-muted tabular-nums">
          {formatTime(slot.end)} · {formatHours(slot.durationHours)}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-ink">{fullName(slot.instructor)}</span>
          {isReferent && <Badge tone="brand">Référent·e</Badge>}
        </span>
        <span className="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
          <MapPin className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
          {slot.meetingPoint}
        </span>
      </span>
      <span
        aria-hidden
        className="hidden h-10 shrink-0 items-center gap-1 rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold text-ink transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-on-brand sm:inline-flex"
      >
        Choisir
        <ChevronRight className="size-4" aria-hidden />
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink-subtle sm:hidden" aria-hidden />
    </button>
  );
}
