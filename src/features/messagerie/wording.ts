// Labels and dates of the messaging page, built on src/lib/format.ts (fr-FR, Europe/Paris).

import {
  dayKey,
  formatDate,
  formatDateShort,
  formatDayOfMonth,
  formatMonthShort,
  formatRelativeDay,
  formatTime,
  initials,
} from "@/lib/format";
import type { MessageParty } from "@/lib/types";
import { SUBJECT_MAX } from "./action-state";

type Party = { kind: MessageParty; name: string };

export const PARTY_LABEL: Record<MessageParty, string> = { moniteur: "Moniteur", ecole: "Auto-école" };

/** Option of the "Destinataire" select: "Moniteur · Sophie Laurent", "Auto-école Dupont". */
export function recipientLabel(party: Party): string {
  if (party.kind === "moniteur") return `${PARTY_LABEL.moniteur} · ${party.name}`;
  return /auto-?école/i.test(party.name) ? party.name : `${PARTY_LABEL.ecole} · ${party.name}`;
}

/** "Sophie Laurent" → "SL", "Auto-école Dupont" → "AD". */
export function nameInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return initials(words[0] ?? "", words.length > 1 ? words[words.length - 1] : "");
}

const sameYear = (iso: string, nowIso: string) => dayKey(iso).slice(0, 4) === dayKey(nowIso).slice(0, 4);

/** List column: "09:15" today, "Hier", "29 oct." this year, "29/10/2025" before. */
export function formatListDate(iso: string, nowIso: string): string {
  if (dayKey(iso) === dayKey(nowIso)) return formatTime(iso);
  if (formatRelativeDay(iso, nowIso) === "Hier") return "Hier";
  if (sameYear(iso, nowIso)) return `${formatDayOfMonth(iso)} ${formatMonthShort(iso)}`;
  return formatDateShort(iso);
}

/** Opened message: "Aujourd'hui à 09:15", "Jeudi 29 octobre à 11:40", "29 octobre 2025 à 11:40". */
export function formatSentAt(iso: string, nowIso: string): string {
  const day = sameYear(iso, nowIso) ? formatRelativeDay(iso, nowIso) : formatDate(iso);
  return `${day} à ${formatTime(iso)}`;
}

/** One-line preview; also keeps the row's accessible name short. */
export function previewOf(body: string, max = 140): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** "Re : Document validé" (not doubled when replying to a reply). */
export function replySubject(subject: string): string {
  return (/^re\s*:/i.test(subject) ? subject : `Re : ${subject}`).slice(0, SUBJECT_MAX);
}
