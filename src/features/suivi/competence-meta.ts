import { CircleCheck, CircleDashed, TrendingUp, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/tone";
import type { CompetenceStatus } from "@/lib/types";

/** Status of a REMC competence, set by the instructors. Always shown with its text and icon. */
export const COMPETENCE_STATUS_META: Record<CompetenceStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  acquis: { label: "Acquis", tone: "success", icon: CircleCheck },
  en_progression: { label: "En progression", tone: "info", icon: TrendingUp },
  a_renforcer: { label: "À renforcer", tone: "warning", icon: TriangleAlert },
  non_aborde: { label: "Non abordé", tone: "neutral", icon: CircleDashed },
};
