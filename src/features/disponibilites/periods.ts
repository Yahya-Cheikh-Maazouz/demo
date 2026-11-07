// Weekly availabilities are stored as plain time ranges ({ day, from, to }): the staff "fiche
// élève" shows them as such. The student picks them in a grid of 3 periods per day. This file
// is the only place that maps one onto the other.

import type { Availability } from "@/lib/types";

export type Day = Availability["day"];

export const DAYS: Day[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export const PERIODS = [
  { id: "matin", label: "Matin", hint: "avant 12 h", from: "08:00", to: "12:00" },
  { id: "apres-midi", label: "Après-midi", hint: "12 h – 18 h", from: "12:00", to: "18:00" },
  { id: "soir", label: "Soir", hint: "après 18 h", from: "18:00", to: "21:00" },
] as const;

export type Period = (typeof PERIODS)[number];
export type PeriodId = Period["id"];

/** One cell of the grid, "Lundi.matin". Also the value of the grid's checkboxes. */
export type CellKey = `${Day}.${PeriodId}`;

export const cellKey = (day: Day, period: PeriodId): CellKey => `${day}.${period}`;

export function isCellKey(value: unknown): value is CellKey {
  if (typeof value !== "string") return false;
  const [day, period, ...rest] = value.split(".");
  return rest.length === 0 && DAYS.includes(day as Day) && PERIODS.some((p) => p.id === period);
}

/** "Samedi" is the only week-end day of the grid. */
export const dayKind = (day: Day) => (day === "Samedi" ? "Week-end" : "Semaine");

/** "HH:MM" strings compare in time order. */
const overlaps = (range: Pick<Availability, "from" | "to">, period: Period) => range.from < period.to && period.from < range.to;

/** Grid cells of each period a range overlaps. */
function cellsOfRange(range: Availability): CellKey[] {
  return PERIODS.filter((p) => overlaps(range, p)).map((p) => cellKey(range.day, p.id));
}

/** A cell is checked when one of the recorded ranges overlaps its period. Grid order. */
export function cellsOf(availabilities: Availability[]): CellKey[] {
  const checked = new Set(availabilities.flatMap(cellsOfRange));
  return DAYS.flatMap((day) => PERIODS.map((p) => cellKey(day, p.id))).filter((key) => checked.has(key));
}

/**
 * Ranges to save for the checked cells: one range per checked cell (the period's hours).
 * A range recorded earlier (e.g. by the school: "Samedi 09:00 – 12:00") is kept as is while every
 * cell it covers stays checked, so saving the grid never widens hours the student did not touch.
 * Ranges outside the grid's hours (e.g. 06:30 – 07:30) cover no cell and are kept too.
 */
export function rangesFor(cells: Iterable<CellKey>, previous: Availability[]): Availability[] {
  const checked = new Set(cells);
  const kept = previous.filter((range) => cellsOfRange(range).every((key) => checked.has(key)));
  const covered = new Set(kept.flatMap(cellsOfRange));
  const added: Availability[] = DAYS.flatMap((day) =>
    PERIODS.filter((p) => checked.has(cellKey(day, p.id)) && !covered.has(cellKey(day, p.id))).map((p) => ({
      day,
      from: p.from,
      to: p.to,
    })),
  );
  return [...kept, ...added].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.from.localeCompare(b.from));
}

/** "Lundi : soir · Mardi : matin, après-midi", grouped by day for summaries. */
export function periodsByDay(cells: Iterable<CellKey>): Array<{ day: Day; periods: Period[] }> {
  const checked = new Set(cells);
  return DAYS.map((day) => ({ day, periods: PERIODS.filter((p) => checked.has(cellKey(day, p.id))) })).filter(
    (d) => d.periods.length > 0,
  );
}

/** "Aucun créneau", "1 créneau", "8 créneaux". */
export function slotCount(count: number): string {
  if (count === 0) return "Aucun créneau";
  return `${count} ${count > 1 ? "créneaux" : "créneau"}`;
}
