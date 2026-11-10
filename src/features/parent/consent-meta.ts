import {
  Camera,
  CircleCheck,
  CircleDashed,
  CircleX,
  Hourglass,
  Mail,
  Phone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/components/ui/tone";
import type { Consent, ConsentKey, GuardianValidationStatus } from "@/lib/types";

type ConsentMeta = {
  label: string;
  icon: LucideIcon;
  /**
   * What the parent allows for this child and, when the app applies it, what changes without it.
   * Only what the app really does: no promise it does not keep.
   */
  description: (firstName: string) => string;
  /** For the school's staff, while the authorisation is not given: what the team must respect. */
  withoutIt: (firstName: string) => string;
};

/**
 * The authorisations a legal guardian gives for a minor (CLAUDE.md, "Sécurité et RGPD"). Where each
 * one applies: src/lib/mock/guardian.ts (RGPD → no new lesson; phone → the instructor gets the
 * guardian's number; photos and communications → shown in the student's file to the staff).
 */
export const CONSENT_META: Record<ConsentKey, ConsentMeta> = {
  photos: {
    label: "Photos et vidéos pendant les leçons",
    icon: Camera,
    description: (name) =>
      `Le moniteur peut prendre ${name} en photo ou en vidéo pendant une leçon, par exemple pour revoir une manœuvre avec ${name}.`,
    withoutIt: (name) => `Pas de photo ni de vidéo de ${name} pendant les leçons.`,
  },
  contact_telephone: {
    label: "Contact téléphonique direct par le moniteur",
    icon: Phone,
    description: (name) =>
      `Le moniteur peut appeler ${name} directement (retard, point de rendez-vous). Sans cet accord, l'application ne lui donne pas le numéro de ${name} : il vous appelle à la place.`,
    withoutIt: (name) => `Les moniteurs n'ont pas le numéro de ${name} : ils appellent le représentant légal.`,
  },
  rgpd: {
    label: "Traitement des données personnelles (RGPD)",
    icon: ShieldCheck,
    description: (name) =>
      `Couvre le dossier ANTS, le planning, le livret et les factures de ${name}. Sans ce consentement, aucune nouvelle leçon ne peut être planifiée pour ${name}.`,
    withoutIt: (name) => `Aucune nouvelle leçon ne peut être planifiée pour ${name}.`,
  },
  communications: {
    label: "Communications par e-mail et SMS",
    icon: Mail,
    description: (name) =>
      `Rappels de leçons, suivi du dossier et informations de l'auto-école, par e-mail et SMS, pour vous et pour ${name}.`,
    withoutIt: (name) => `Pas de rappels ni d'informations par e-mail ou SMS à ${name} et à son représentant légal.`,
  },
};

type StatusMeta = { label: string; tone: Tone; icon: LucideIcon };

/** Always shown as text with an icon: the switch position alone never carries the decision. */
export function consentStatusMeta(consent: Pick<Consent, "granted" | "decidedAt" | "required">): StatusMeta {
  if (consent.granted) return { label: "Autorisé", tone: "success", icon: CircleCheck };
  if (!consent.decidedAt) return { label: "À donner", tone: "warning", icon: CircleDashed };
  return { label: "Refusé", tone: consent.required ? "danger" : "neutral", icon: CircleX };
}

export const VALIDATION_STATUS_META: Record<GuardianValidationStatus, StatusMeta> = {
  en_attente: { label: "À valider", tone: "warning", icon: Hourglass },
  acceptee: { label: "Acceptée", tone: "success", icon: CircleCheck },
  refusee: { label: "Refusée", tone: "neutral", icon: CircleX },
};
