"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import {
  decideChildValidation,
  getChildPayments,
  payChildInstallment,
  requestParentAccountDeletion,
  requestParentDataExport,
  setChildConsent,
} from "@/lib/api/parent";
import type { ConsentKey } from "@/lib/types";
import type { ConsentFormState, ParentPaymentState, ParentPrivacyState, ValidationFormState } from "./action-state";

// Every id sent by the form (child, instalment, proposal) is checked again by the API: it only
// acts on a child linked to the signed-in parent. Amounts never come from the browser.

const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez.";
const CONSENT_KEYS: ConsentKey[] = ["photos", "contact_telephone", "rgpd", "communications"];
const METHOD_ERROR = "Choisissez un moyen de paiement : carte bancaire ou Klarna.";

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const isConsentKey = (value: string): value is ConsentKey => (CONSENT_KEYS as string[]).includes(value);

/** Gives or withdraws one authorisation for the child. */
export async function setConsentAction(prev: ConsentFormState, formData: FormData): Promise<ConsentFormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const childId = readText(formData, "childId");
  const key = readText(formData, "key");
  const granted = readText(formData, "granted");
  if (!childId || !isConsentKey(key) || (granted !== "true" && granted !== "false")) {
    return { status: "error", message: "Cette autorisation n'a pas pu être lue. Rechargez la page puis réessayez.", attempt };
  }

  let result: Awaited<ReturnType<typeof setChildConsent>>;
  try {
    result = await setChildConsent(childId, key, granted === "true");
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) return { status: "error", message: result.error, attempt };

  refresh();
  return {
    status: "success",
    message: result.data.consent.granted ? "Autorisation enregistrée." : "Refus enregistré.",
    attempt,
  };
}

/** Accepts or refuses an item proposed by the school (e.g. a change of formula). */
export async function decideValidationAction(prev: ValidationFormState, formData: FormData): Promise<ValidationFormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const childId = readText(formData, "childId");
  const validationId = readText(formData, "validationId");
  const decision = readText(formData, "decision");
  if (!childId || !validationId || (decision !== "accepte" && decision !== "refuse")) {
    return { status: "error", message: "Cette demande n'a pas pu être lue. Rechargez la page puis réessayez.", attempt };
  }

  let result: Awaited<ReturnType<typeof decideChildValidation>>;
  try {
    result = await decideChildValidation(childId, validationId, decision);
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) {
    // Already handled (elsewhere or in another tab): show the current state.
    if (result.code === "deja_traitee") refresh();
    return { status: "error", message: result.error, attempt };
  }

  refresh();
  return {
    status: "success",
    message:
      decision === "accepte"
        ? "Votre accord a été envoyé à l'auto-école."
        : "Votre refus a été envoyé à l'auto-école. Elle vous recontactera si besoin.",
    attempt,
  };
}

/** Pays the child's next instalment (simulated Stripe payment) and returns the invoice. */
export async function payInstallmentAction(prev: ParentPaymentState, formData: FormData): Promise<ParentPaymentState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const childId = readText(formData, "childId");
  const installmentId = readText(formData, "installmentId");
  const method = readText(formData, "method");
  if (method !== "carte" && method !== "klarna") {
    return { status: "error", message: METHOD_ERROR, fieldErrors: { method: METHOD_ERROR }, attempt };
  }

  let result: Awaited<ReturnType<typeof payChildInstallment>>;
  try {
    // Re-read the plan from the API: the amount and the hours never come from the browser.
    const payments = await getChildPayments(childId);
    const installment = payments?.installments.find((i) => i.id === installmentId);
    if (!payments || !installment || installment.status === "payee") {
      return { status: "error", message: "Cette échéance est déjà réglée.", attempt };
    }
    result = await payChildInstallment(childId, installment.id, method);
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) return { status: "error", message: result.error, attempt };

  refresh();
  const { invoice, hours } = result.data;
  return {
    status: "success",
    attempt,
    receipt: { invoiceNumber: invoice.number, label: invoice.label, amount: invoice.amount, hours },
  };
}

/** RGPD: export of the parent's own data, sent by e-mail. */
export async function requestParentExportAction(prev: ParentPrivacyState): Promise<ParentPrivacyState> {
  const attempt = (prev.attempt ?? 0) + 1;
  let result: Awaited<ReturnType<typeof requestParentDataExport>>;
  try {
    result = await requestParentDataExport();
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) return { status: "error", message: result.error, attempt };
  return {
    status: "success",
    message: "Vous recevrez un e-mail avec un lien de téléchargement sécurisé d'ici 48 heures.",
    attempt,
  };
}

/** RGPD: request to delete the parent's account, processed by the school. */
export async function requestParentDeletionAction(prev: ParentPrivacyState): Promise<ParentPrivacyState> {
  const attempt = (prev.attempt ?? 0) + 1;
  let result: Awaited<ReturnType<typeof requestParentAccountDeletion>>;
  try {
    result = await requestParentAccountDeletion();
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) return { status: "error", message: result.error, attempt };
  refresh();
  return { status: "success", requestedAt: result.data.requestedAt, attempt };
}
