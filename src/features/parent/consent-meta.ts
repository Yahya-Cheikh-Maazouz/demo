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
  /** What the parent allows, for this child. */
  description: (firstName: string) => string;
};

/** The authorisations a legal guardian gives for a minor (CLAUDE.md, "Sécurité et RGPD"). */
export const CONSENT_META: Record<ConsentKey, ConsentMeta> = {
  photos: {
    label: "Photos et vidéos pendant les leçons",
    icon: Camera,
    description: (name) =>
      `Le moniteur peut photographier ou filmer une manœuvre pour l'expliquer à ${name} dans son livret. Les images ne sont jamais publiées.`,
  },
  contact_telephone: {
    label: "Contact téléphonique direct par le moniteur",
    icon: Phone,
    description: (name) =>
      `Le moniteur peut appeler ou écrire directement à ${name} (retard, point de rendez-vous). Sans cet accord, il passe par vous.`,
  },
  rgpd: {
    label: "Traitement des données personnelles (RGPD)",
    icon: ShieldCheck,
    description: (name) =>
      `Nécessaire à la formation de ${name} : dossier ANTS, planning, livret et factures. Les données sont conservées pendant la formation, puis archivées comme la loi l'exige.`,
  },
  communications: {
    label: "Communications par e-mail et SMS",
    icon: Mail,
    description: (name) =>
      `Rappels de leçons, suivi du dossier et informations de l'auto-école, envoyés à vous et à ${name}.`,
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
