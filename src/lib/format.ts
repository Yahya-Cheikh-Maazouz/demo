// Display formatting. Always fr-FR and Europe/Paris, whatever the server or device timezone.

export const LOCALE = "fr-FR";
export const TIME_ZONE = "Europe/Paris";

const dateLong = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});
const dateShort = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const dateMedium = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const weekdayShort = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: TIME_ZONE });
const monthShort = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: TIME_ZONE });
const dayOfMonth = new Intl.DateTimeFormat(LOCALE, { day: "numeric", timeZone: TIME_ZONE });
const time = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
const isoDay = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Jeudi 29 octobre" */
export function formatDateLong(iso: string): string {
  return capitalize(dateLong.format(new Date(iso)));
}

/** "29 octobre 2026" */
export function formatDate(iso: string): string {
  return dateMedium.format(new Date(iso));
}

const monthYear = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: TIME_ZONE });

/** "Octobre 2026" */
export function formatMonthYear(iso: string): string {
  return capitalize(monthYear.format(new Date(iso)));
}

/** "29/10/2026" */
export function formatDateShort(iso: string): string {
  return dateShort.format(new Date(iso));
}

/** "jeu." */
export function formatWeekdayShort(iso: string): string {
  return weekdayShort.format(new Date(iso));
}

/** "oct." */
export function formatMonthShort(iso: string): string {
  return monthShort.format(new Date(iso));
}

/** "29" */
export function formatDayOfMonth(iso: string): string {
  return dayOfMonth.format(new Date(iso));
}

/** "14:00" */
export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

/** "14:00 – 16:00" */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

/** Calendar day in Paris, "2026-10-29". Use it to group items by day. */
export function dayKey(iso: string): string {
  return isoDay.format(new Date(iso));
}

/** "Aujourd'hui", "Demain", "Hier", or the long date. `nowIso` must come from the server. */
export function formatRelativeDay(iso: string, nowIso: string): string {
  const diff = Math.round(
    (Date.parse(`${dayKey(iso)}T00:00:00Z`) - Date.parse(`${dayKey(nowIso)}T00:00:00Z`)) / 86_400_000,
  );
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff === -1) return "Hier";
  return formatDateLong(iso);
}

const euro = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const euroRound = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** "1 200,00 €", or "1 200 €" with `{ round: true }` for whole amounts. */
export function formatCurrency(amount: number, options: { round?: boolean } = {}): string {
  return (options.round && Number.isInteger(amount) ? euroRound : euro).format(amount);
}

const decimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });

/** "2 h", "1,5 h", "−1 h", with a non-breaking space so the unit never wraps alone. */
export function formatHours(hours: number): string {
  return `${decimal.format(hours)} h`;
}

/** "850 Ko", "2,4 Mo" */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${decimal.format(Math.max(1, Math.round(bytes / 1024)))} Ko`;
  return `${decimal.format(bytes / (1024 * 1024))} Mo`;
}

/** "21••••••76": the NEPH is never displayed in full by default. */
export function maskNeph(neph: string): string {
  if (neph.length <= 4) return neph;
  return `${neph.slice(0, 2)}${"•".repeat(Math.max(neph.length - 4, 0))}${neph.slice(-2)}`;
}

/** "06 •• •• •• 90" */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `${digits.slice(0, 2)} •• •• •• ${digits.slice(-2)}`;
}

/** "j••••@exemple.fr" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.charAt(0)}••••@${domain}`;
}

/** Age in years at `nowIso`. */
export function ageAt(birthIso: string, nowIso: string): number {
  const [by, bm, bd] = dayKey(birthIso).split("-").map(Number);
  const [ny, nm, nd] = dayKey(nowIso).split("-").map(Number);
  return ny - by - (nm < bm || (nm === bm && nd < bd) ? 1 : 0);
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
