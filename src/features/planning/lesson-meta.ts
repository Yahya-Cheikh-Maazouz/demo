import {
  BookOpen,
  CalendarCheck,
  Car,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Clock,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/components/ui/tone";
import type { LessonStatus, LessonType } from "@/lib/types";

export const LESSON_TYPE_META: Record<LessonType, { label: string; icon: LucideIcon }> = {
  conduite: { label: "Leçon de conduite", icon: Car },
  code: { label: "Leçon de code", icon: BookOpen },
  examen_blanc: { label: "Examen blanc", icon: ClipboardCheck },
  examen: { label: "Examen", icon: GraduationCap },
};

/** Lesson status colors are shared with the staff planning: keep them in sync. */
export const LESSON_STATUS_META: Record<LessonStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  confirme: { label: "Confirmé", tone: "info", icon: CalendarCheck },
  effectue: { label: "Effectué", tone: "success", icon: CircleCheck },
  annule: { label: "Annulé", tone: "neutral", icon: CircleX },
  attente_paiement: { label: "En attente de paiement", tone: "warning", icon: Clock },
};
