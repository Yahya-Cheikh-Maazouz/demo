import {
  BookOpen,
  CalendarCheck,
  Car,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/components/ui/tone";
import type { Lesson, LessonStatus, LessonType } from "@/lib/types";

export const LESSON_TYPE_META: Record<LessonType, { label: string; icon: LucideIcon }> = {
  conduite: { label: "Leçon de conduite", icon: Car },
  code: { label: "Leçon de code", icon: BookOpen },
  examen_blanc: { label: "Examen blanc", icon: ClipboardCheck },
  examen: { label: "Examen", icon: GraduationCap },
};

/** Lesson status colors are shared with the staff planning: keep them in sync. */
export const LESSON_STATUS_META: Record<LessonStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  a_confirmer: { label: "À confirmer", tone: "brand", icon: Hourglass },
  confirme: { label: "Confirmé", tone: "info", icon: CalendarCheck },
  effectue: { label: "Effectué", tone: "success", icon: CircleCheck },
  annule: { label: "Annulé", tone: "neutral", icon: CircleX },
  attente_paiement: { label: "En attente de paiement", tone: "warning", icon: Clock },
};

/**
 * Status as the student reads it (wording of the client's prototype): a confirmed lesson is
 * "Planifié", a done driving lesson "Effectué · Consommé", a no-show "Absent · Payable".
 */
export function studentStatusMeta(lesson: Pick<Lesson, "status" | "type" | "noShow" | "chargedHours">): {
  label: string;
  tone: Tone;
  icon: LucideIcon;
} {
  const meta = LESSON_STATUS_META[lesson.status];
  switch (lesson.status) {
    case "confirme":
      return { ...meta, label: "Planifié" };
    case "effectue":
      return { ...meta, label: lesson.type === "code" ? "Effectué" : "Effectué · Consommé" };
    case "annule":
      if (lesson.noShow) return { ...meta, label: "Absent · Payable", tone: "danger" };
      if (lesson.chargedHours) return { ...meta, label: "Annulé · Décompté", tone: "warning" };
      return meta;
    default:
      return meta;
  }
}
