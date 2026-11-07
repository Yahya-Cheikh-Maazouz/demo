// Labels of the subscription states of a school to the platform, shared by the super-admin
// back-office and the gérant's subscription page. Every status has a label and an icon: the color
// is never the only signal.

import { Ban, CircleCheck, Hourglass, Lock, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/tone";
import type { Quota, SubscriptionStatus } from "@/lib/types";

export const SUBSCRIPTION_STATUS_META: Record<
  SubscriptionStatus,
  {
    label: string;
    tone: Tone;
    icon: LucideIcon;
    /** What the status means for the school, seen from the platform. */
    meaning: string;
  }
> = {
  essai: {
    label: "Essai",
    tone: "info",
    icon: Hourglass,
    meaning: "Période d'essai gratuite : tout fonctionne. Le premier paiement a lieu à la fin de l'essai.",
  },
  actif: {
    label: "Actif",
    tone: "success",
    icon: CircleCheck,
    meaning: "Abonnement à jour : l'espace fonctionne normalement pour toute l'équipe, les élèves et les parents.",
  },
  impaye: {
    label: "Impayé",
    tone: "warning",
    icon: TriangleAlert,
    meaning:
      "Le dernier paiement a été refusé et le gérant a été prévenu. L'espace reste utilisable pendant le délai de grâce, puis passe en lecture seule.",
  },
  lecture_seule: {
    label: "Lecture seule",
    tone: "danger",
    icon: Lock,
    meaning:
      "Délai de grâce dépassé : chacun consulte ses informations, mais aucune modification n'est possible (réservations, encaissements, messages…).",
  },
  suspendu: {
    label: "Suspendu",
    tone: "danger",
    icon: Ban,
    meaning: "Seul le gérant peut se connecter, pour régulariser l'abonnement. L'équipe, les élèves et les parents sont refusés.",
  },
};

export const SUBSCRIPTION_STATUSES = Object.keys(SUBSCRIPTION_STATUS_META) as SubscriptionStatus[];

/** Warn at 80 % of a limit; at 100 % the creation is blocked (existing data never is). */
export type QuotaLevel = "ok" | "warning" | "full";

export function quotaLevel(quota: Quota): QuotaLevel {
  if (quota.used >= quota.limit) return "full";
  return quota.used >= quota.limit * 0.8 ? "warning" : "ok";
}
