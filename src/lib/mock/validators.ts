// Field checks shared by the mock enrolment, file edition and import, like the API will do them.
// They return the normalized value, or null when the value is invalid.

/** French phone: 10 digits starting with 0, or +33 / 0033. Returns "06 12 34 56 78". */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("+33")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("0033")) digits = `0${digits.slice(4)}`;
  if (!/^0[1-9]\d{8}$/.test(digits)) return null;
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ");
}

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254 ? email : null;
}

/** NEPH: 12 digits (spaces allowed in the input). */
export function normalizeNeph(raw: string): string | null {
  const digits = raw.replace(/\s/g, "");
  return /^\d{12}$/.test(digits) ? digits : null;
}

export function normalizePostalCode(raw: string): string | null {
  const code = raw.replace(/\s/g, "");
  return /^\d{5}$/.test(code) ? code : null;
}

/** "AAAA-MM-JJ", "JJ/MM/AAAA", "J/M/AAAA", "JJ-MM-AAAA" or "JJ.MM.AAAA" → "AAAA-MM-JJ" (real dates only). */
export function normalizeDate(raw: string): string | null {
  const value = raw.trim();
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/.exec(value);
  let year: number, month: number, day: number;
  if (match) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value);
    if (!match) return null;
    [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** "HH:MM", 00:00 to 23:59. */
export function isValidTime(raw: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw);
}

/** Trimmed text of 1 to `max` characters, or null. */
export function cleanText(raw: string | null | undefined, max = 120): string | null {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  return text.length > 0 && text.length <= max ? text : null;
}
