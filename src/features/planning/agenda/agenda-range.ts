// Staff planning: which days a view shows and how it is encoded in the URL
// (/gestion/planning?vue=semaine&date=2026-11-02&moniteur=i-sophie). Pure: client and server.

import { formatDateLong, formatMonthYear } from "@/lib/format";
import { addDays, mondayOf, parisDateTime } from "@/lib/paris-time";

export type AgendaView = "jour" | "semaine" | "mois";

export const AGENDA_VIEWS: Array<{ view: AgendaView; label: string }> = [
  { view: "jour", label: "Jour" },
  { view: "semaine", label: "Semaine" },
  { view: "mois", label: "Mois" },
];

export const ALL_INSTRUCTORS = "tous";

export type AgendaQuery = {
  view: AgendaView;
  /** Paris calendar day, "2026-11-02". */
  date: string;
  /** Instructor id, or "tous". */
  instructor: string;
};

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[\w-]{1,64}$/;

type SearchParams = Record<string, string | string[] | undefined>;

export function parseAgendaQuery(params: SearchParams, todayKey: string): AgendaQuery {
  const one = (name: string) => (typeof params[name] === "string" ? (params[name] as string) : undefined);
  const view = AGENDA_VIEWS.some((v) => v.view === one("vue")) ? (one("vue") as AgendaView) : "semaine";
  const date = one("date") && DAY_KEY.test(one("date")!) ? one("date")! : todayKey;
  const instructor = one("moniteur") && ID.test(one("moniteur")!) ? one("moniteur")! : ALL_INSTRUCTORS;
  return { view, date, instructor };
}

export function agendaHref(query: AgendaQuery): string {
  const params = new URLSearchParams({ vue: query.view, date: query.date });
  if (query.instructor !== ALL_INSTRUCTORS) params.set("moniteur", query.instructor);
  return `/gestion/planning?${params}`;
}

/** Monday–Saturday (the school is closed on Sunday). */
export function weekDays(dateKey: string): string[] {
  const monday = mondayOf(dateKey);
  return Array.from({ length: 6 }, (_, i) => addDays(monday, i));
}

/** The 6 full weeks (Monday to Sunday) that contain the month of `dateKey`. */
export function monthDays(dateKey: string): string[] {
  const first = mondayOf(`${dateKey.slice(0, 7)}-01`);
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function agendaDays(query: AgendaQuery): string[] {
  if (query.view === "jour") return [query.date];
  if (query.view === "semaine") return weekDays(query.date);
  return monthDays(query.date);
}

/** [from, to) instants covering the days of the view. */
export function agendaRange(query: AgendaQuery): { from: string; to: string } {
  const days = agendaDays(query);
  return {
    from: parisDateTime(days[0]).toISOString(),
    to: parisDateTime(addDays(days[days.length - 1], 1)).toISOString(),
  };
}

/** Previous (-1) or next (1) day, week or month. */
export function shiftedDate(query: AgendaQuery, direction: -1 | 1): string {
  if (query.view === "jour") return addDays(query.date, direction);
  if (query.view === "semaine") return addDays(mondayOf(query.date), 7 * direction);
  const [year, month] = query.date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + direction, 1));
  return target.toISOString().slice(0, 10);
}

/** An instant inside the day (noon), to feed the format.ts helpers. */
export const noonOf = (key: string) => parisDateTime(key, 12).toISOString();

const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

/** "Lundi 2 novembre", "2 – 7 novembre 2026", "Novembre 2026". */
export function agendaTitle(query: AgendaQuery): string {
  if (query.view === "jour") return formatDateLong(noonOf(query.date));
  if (query.view === "mois") return formatMonthYear(noonOf(query.date));
  const days = weekDays(query.date);
  const first = days[0];
  const last = days[days.length - 1];
  const year = last.slice(0, 4);
  if (first.slice(0, 7) === last.slice(0, 7)) {
    return `${Number(first.slice(8))} – ${Number(last.slice(8))} ${formatMonthYear(noonOf(last)).toLowerCase()}`;
  }
  return `${shortDate.format(new Date(noonOf(first)))} – ${shortDate.format(new Date(noonOf(last)))} ${year}`;
}
