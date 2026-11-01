// Calendar helpers for the planning screens. Every instant derives from the server "now" (ISO):
// nothing here reads the current time.

import { dayKey } from "@/lib/format";

export type CalendarDay = {
  /** Paris calendar day, "2026-10-30". */
  key: string;
  /** An instant inside that day (12:00 UTC), to feed the format.ts helpers. */
  iso: string;
};

/** `count` consecutive Paris days, starting `from` days after the day of `nowIso`. */
export function nextDays(nowIso: string, count: number, from = 1): CalendarDay[] {
  const [year, month, day] = dayKey(nowIso).split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    // Noon UTC is always the same calendar day in Paris, whatever the DST offset.
    const iso = new Date(Date.UTC(year, month - 1, day + from + index, 12)).toISOString();
    return { key: dayKey(iso), iso };
  });
}

/** Groups items by a key, keeping the order in which keys first appear. */
export function groupBy<T>(items: T[], keyOf: (item: T) => string): Array<{ key: string; items: T[] }> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return Array.from(groups, ([key, groupItems]) => ({ key, items: groupItems }));
}
