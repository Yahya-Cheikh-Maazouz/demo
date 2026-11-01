// Paris calendar helpers, independent of the server or device timezone. Pure: safe on client and server.

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parisParts(date: Date) {
  const p = Object.fromEntries(partsFormat.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

function parisOffsetMs(date: Date): number {
  const p = parisParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (date.getTime() - date.getMilliseconds());
}

/** Instant of `hour:minute` in Paris, `dayOffset` days after the Paris date of `now`. */
export function parisTime(now: Date, dayOffset: number, hour: number, minute = 0): Date {
  const p = parisParts(now);
  const guess = Date.UTC(p.year, p.month - 1, p.day + dayOffset, hour, minute);
  const offset = parisOffsetMs(new Date(guess));
  const result = new Date(guess - offset);
  const corrected = parisOffsetMs(result);
  return corrected === offset ? result : new Date(guess - corrected);
}

/** 0 = Sunday … 6 = Saturday, for the Paris date `dayOffset` days after `now`. */
export function parisWeekday(now: Date, dayOffset: number): number {
  const p = parisParts(now);
  return new Date(Date.UTC(p.year, p.month - 1, p.day + dayOffset)).getUTCDay();
}

/** Monday-based week number key ("2026-W44"-like, stable within a Paris week). */
export function parisWeekKey(date: Date): string {
  const p = parisParts(date);
  const day = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const mondayOffset = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - mondayOffset);
  return day.toISOString().slice(0, 10);
}

/** Instant of `hour:minute` in Paris on the calendar day `key` ("2026-11-02"). */
export function parisDateTime(key: string, hour = 0, minute = 0): Date {
  const [year, month, day] = key.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = parisOffsetMs(new Date(guess));
  const result = new Date(guess - offset);
  const corrected = parisOffsetMs(result);
  return corrected === offset ? result : new Date(guess - corrected);
}

/** Minutes since midnight in Paris, e.g. 14:30 → 870. */
export function parisMinutes(iso: string): number {
  const p = parisParts(new Date(iso));
  return p.hour * 60 + p.minute;
}

/** Calendar day `days` after `key` ("2026-11-02" + 1 → "2026-11-03"). */
export function addDays(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, for the calendar day `key`. */
export function weekdayOf(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Monday of the week of `key`. */
export function mondayOf(key: string): string {
  return addDays(key, -((weekdayOf(key) + 6) % 7));
}
