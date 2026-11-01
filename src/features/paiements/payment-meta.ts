import {
  Banknote,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  Clock,
  CreditCard,
  Landmark,
  ReceiptText,
  Split,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/components/ui/tone";
import type { InstallmentStatus, InvoiceStatus, PaymentMethod } from "@/lib/types";

type MethodMeta = {
  label: string;
  icon: LucideIcon;
  /** Ends the sentence "Payée le 17 octobre 2026 …". */
  phrase: string;
};

export const PAYMENT_METHOD_META: Record<PaymentMethod, MethodMeta> = {
  carte: { label: "Carte bancaire", icon: CreditCard, phrase: "par carte bancaire" },
  klarna: { label: "Klarna", icon: Split, phrase: "avec Klarna, en 3 fois sans frais" },
  especes: { label: "Espèces", icon: Banknote, phrase: "en espèces" },
  cheque: { label: "Chèque", icon: ReceiptText, phrase: "par chèque" },
  virement: { label: "Virement", icon: Landmark, phrase: "par virement" },
};

/** Methods a student can use online (Stripe Checkout). The others are recorded at the agency. */
export const ONLINE_METHODS = ["carte", "klarna"] as const;
export type OnlineMethod = (typeof ONLINE_METHODS)[number];

export function isOnlineMethod(value: string): value is OnlineMethod {
  return (ONLINE_METHODS as readonly string[]).includes(value);
}

type StatusMeta = { label: string; tone: Tone; icon: LucideIcon };

export const INSTALLMENT_STATUS_META: Record<InstallmentStatus, StatusMeta> = {
  payee: { label: "Payée", tone: "success", icon: CircleCheck },
  a_venir: { label: "À venir", tone: "info", icon: CalendarClock },
  en_retard: { label: "En retard", tone: "danger", icon: CircleAlert },
};

export const INVOICE_STATUS_META: Record<InvoiceStatus, StatusMeta> = {
  payee: { label: "Payée", tone: "success", icon: CircleCheck },
  en_attente: { label: "En attente", tone: "warning", icon: Clock },
  en_retard: { label: "En retard", tone: "danger", icon: CircleAlert },
};

/** "1 h ajoutée", "1,5 h ajoutée", "5 h ajoutées": in French, the plural starts at 2. */
export function addedHoursWord(hours: number): string {
  return hours < 2 ? "ajoutée" : "ajoutées";
}

/** Printable invoice page. The real API will rather return a signed, expiring PDF link. */
export function invoiceHref(invoiceNumber: string): string {
  return `/eleve/paiements/factures/${encodeURIComponent(invoiceNumber)}`;
}

/** Invoice numbers are "F202610-00074": anything else is rejected before reaching the API. */
export const INVOICE_NUMBER_PATTERN = /^[A-Z0-9][A-Z0-9-]{0,31}$/i;
