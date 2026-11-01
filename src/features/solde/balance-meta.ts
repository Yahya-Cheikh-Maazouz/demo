import { CircleAlert, CircleCheck, CircleSlash, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/tone";
import { formatHours } from "@/lib/format";
import type { Balance, BalanceState } from "@/lib/types";

type BalanceStateMeta = {
  label: string;
  tone: Tone;
  icon: LucideIcon;
  /** Sentence explaining the state to the student. */
  message: (balance: Balance) => string;
};

export const BALANCE_STATE_META: Record<BalanceState, BalanceStateMeta> = {
  ok: {
    label: "Solde suffisant",
    tone: "success",
    icon: CircleCheck,
    message: (b) => `Il vous reste ${formatHours(b.afterReservationsHours)} à réserver.`,
  },
  low: {
    label: "Solde bas",
    tone: "warning",
    icon: TriangleAlert,
    message: (b) =>
      `Il ne vous reste que ${formatHours(b.afterReservationsHours)} après vos leçons réservées. Pensez à prévoir votre prochain paiement.`,
  },
  exhausted: {
    label: "Solde épuisé",
    tone: "danger",
    icon: CircleSlash,
    message: () => "Toutes vos heures payées sont utilisées ou réservées. Un paiement est nécessaire pour réserver.",
  },
  uncovered: {
    label: "Réservations non couvertes",
    tone: "danger",
    icon: CircleAlert,
    message: (b) =>
      `Vous disposez de ${formatHours(b.availableHours)} payées, mais ${formatHours(b.reservedHours)} sont programmées. Un paiement est nécessaire pour couvrir toutes vos leçons.`,
  },
  overdrawn: {
    label: "Dépassement",
    tone: "danger",
    icon: CircleAlert,
    message: (b) => `${formatHours(b.toCoverHours)} ont été consommées sans paiement correspondant.`,
  },
};
