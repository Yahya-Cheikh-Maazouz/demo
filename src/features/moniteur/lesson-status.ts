import { PenLine, UserX, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/tone";
import { LESSON_STATUS_META } from "@/features/planning/lesson-meta";
import type { InstructorLesson } from "@/lib/types";

type Meta = { label: string; tone: Tone; icon: LucideIcon };

/**
 * Status as the instructor reads it: À confirmer, Confirmé, Effectué, Annulé or Absent. A lesson
 * waiting for a payment stays "Confirmé": the light says the rest, without any amount.
 */
export function instructorStatusMeta(lesson: Pick<InstructorLesson, "status" | "noShow">): Meta {
  switch (lesson.status) {
    case "confirme":
    case "attente_paiement":
      return LESSON_STATUS_META.confirme;
    case "annule":
      return lesson.noShow ? { label: "Absent", tone: "danger", icon: UserX } : LESSON_STATUS_META.annule;
    default:
      return LESSON_STATUS_META[lesson.status];
  }
}

/** Started and still confirmed: the student has to sign (or is absent). `now` comes from the API. */
export function isToSign(lesson: Pick<InstructorLesson, "status" | "start">, now: string): boolean {
  return (lesson.status === "confirme" || lesson.status === "attente_paiement") && lesson.start <= now;
}

export const TO_SIGN_META: Meta = { label: "À émarger", tone: "warning", icon: PenLine };

/** "/moniteur?date=2026-11-05", or "/moniteur" for today. */
export function dayHref(date: string, today: string): string {
  return date === today ? "/moniteur" : `/moniteur?date=${date}`;
}
