import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  FileCheck,
  FileClock,
  FilePlus,
  FileSignature,
  FileText,
  FileX,
  ReceiptText,
  Stamp,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/components/ui/tone";
import type { DocumentStatus, DownloadableDocument, RequiredDocument } from "@/lib/types";

type StatusMeta = {
  /** Badge of one piece: "Refusé". */
  label: string;
  /** Count in the summary: "Refusées". */
  plural: string;
  tone: Tone;
  /** Badge icon. */
  icon: LucideIcon;
  /** Icon of the piece's tile in the list. */
  fileIcon: LucideIcon;
  /** Most urgent first. */
  rank: number;
};

export const DOCUMENT_STATUS_META: Record<DocumentStatus, StatusMeta> = {
  refuse: { label: "Refusé", plural: "Refusées", tone: "danger", icon: CircleX, fileIcon: FileX, rank: 0 },
  manquant: { label: "Manquant", plural: "Manquantes", tone: "warning", icon: CircleDashed, fileIcon: FilePlus, rank: 1 },
  en_verification: {
    label: "En vérification",
    plural: "En vérification",
    tone: "info",
    icon: Clock,
    fileIcon: FileClock,
    rank: 2,
  },
  valide: { label: "Validé", plural: "Validées", tone: "success", icon: CircleCheck, fileIcon: FileCheck, rank: 3 },
};

/** Order of the counters in the summary: from done to to-do. */
export const SUMMARY_ORDER: DocumentStatus[] = ["valide", "en_verification", "manquant", "refuse"];

/** Refused, then missing, then being checked, then validated. Stable inside a status. */
export function byUrgency(documents: RequiredDocument[]): RequiredDocument[] {
  return [...documents].sort((a, b) => DOCUMENT_STATUS_META[a.status].rank - DOCUMENT_STATUS_META[b.status].rank);
}

export const CATEGORY_META: Record<DownloadableDocument["category"], { label: string; icon: LucideIcon }> = {
  devis: { label: "Devis", icon: FileText },
  contrat: { label: "Contrat de formation", icon: FileSignature },
  facture: { label: "Facture", icon: ReceiptText },
  attestation: { label: "Attestation", icon: Stamp },
};

/** Printable page of a school document. The real API will rather return a signed, expiring PDF link. */
export function schoolDocumentHref(id: string): string {
  return `/eleve/documents/${encodeURIComponent(id)}`;
}

/** Document ids are opaque: anything that does not look like one is rejected before reaching the API. */
export const DOCUMENT_ID_PATTERN = /^[\w:.-]{1,160}$/;
