"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import {
  getDeletionRequest,
  requestAccountDeletion,
  requestDataExport,
  updateContactDetails,
} from "@/lib/api/eleve";
import type { ContactField, ContactFormState, PrivacyActionState } from "./action-state";

// Deliberately loose: the API does the real check. This only catches obvious typos.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** French number once normalized: 10 digits starting with 0 (not 00). */
const FRENCH_PHONE_PATTERN = /^0[1-9]\d{8}$/;
const POSTAL_CODE_PATTERN = /^\d{5}$/;

const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez.";
// The main phone field already shows the expected format as a hint: its error does not repeat it.
const PHONE_ERROR = "Ce numéro doit comporter 10 chiffres et commencer par 0.";
const PHONE_SECONDARY_ERROR = "Saisissez un numéro français à 10 chiffres, par exemple 06 12 34 56 78.";

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** "+33 6 12-34.56.78" → "0612345678". Returns null when it is not a French number. */
function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("+33")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("0033")) digits = `0${digits.slice(4)}`;
  return FRENCH_PHONE_PATTERN.test(digits) ? digits : null;
}

/** "0612345678" → "06 12 34 56 78", the format used everywhere else in the app. */
function formatPhone(digits: string): string {
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ");
}

/** Validates and saves the student's own contact details (e-mail, phones, postal address). */
export async function updateContactDetailsAction(
  prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const values: Record<ContactField, string> = {
    email: readText(formData, "email"),
    phone: readText(formData, "phone"),
    phoneSecondary: readText(formData, "phoneSecondary"),
    line1: readText(formData, "line1").replace(/\s+/g, " "),
    postalCode: readText(formData, "postalCode").replace(/\s/g, ""),
    city: readText(formData, "city").replace(/\s+/g, " "),
  };

  const phone = normalizePhone(values.phone);
  const phoneSecondary = values.phoneSecondary ? normalizePhone(values.phoneSecondary) : null;

  const fieldErrors: Partial<Record<ContactField, string>> = {};
  if (!values.email) fieldErrors.email = "Saisissez votre adresse e-mail.";
  else if (values.email.length > 254 || !EMAIL_PATTERN.test(values.email)) {
    fieldErrors.email = "Saisissez une adresse e-mail valide, par exemple nom@exemple.fr.";
  }

  if (!values.phone) fieldErrors.phone = "Saisissez votre numéro de téléphone.";
  else if (!phone) fieldErrors.phone = PHONE_ERROR;

  if (values.phoneSecondary && !phoneSecondary) fieldErrors.phoneSecondary = PHONE_SECONDARY_ERROR;
  else if (phone && phoneSecondary === phone) {
    fieldErrors.phoneSecondary = "Ce numéro est déjà votre téléphone principal. Laissez ce champ vide ou saisissez-en un autre.";
  }

  if (!values.line1) fieldErrors.line1 = "Saisissez votre adresse (numéro et rue).";
  else if (values.line1.length > 120) fieldErrors.line1 = "L'adresse ne doit pas dépasser 120 caractères.";

  if (!values.postalCode) fieldErrors.postalCode = "Saisissez votre code postal.";
  else if (!POSTAL_CODE_PATTERN.test(values.postalCode)) {
    fieldErrors.postalCode = "Saisissez 5 chiffres, par exemple 75011.";
  }

  if (!values.city) fieldErrors.city = "Saisissez votre ville.";
  else if (values.city.length > 80) fieldErrors.city = "Le nom de la ville ne doit pas dépasser 80 caractères.";

  if (Object.keys(fieldErrors).length > 0 || !phone) {
    return { status: "error", fieldErrors, values, attempt };
  }

  const saved = {
    email: values.email,
    phone: formatPhone(phone),
    phoneSecondary: phoneSecondary ? formatPhone(phoneSecondary) : null,
    address: { line1: values.line1, postalCode: values.postalCode, city: values.city },
  };

  let result: Awaited<ReturnType<typeof updateContactDetails>>;
  try {
    result = await updateContactDetails(saved);
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: NETWORK_ERROR, values, attempt };
  }
  if (!result.ok) return { status: "error", message: result.error, values, attempt };

  refresh();
  return {
    status: "success",
    message: "Vos coordonnées ont été enregistrées.",
    values: {
      ...values,
      phone: saved.phone,
      phoneSecondary: saved.phoneSecondary ?? "",
    },
    attempt,
  };
}

/** RGPD: asks the backend to prepare an export of the student's data, sent by e-mail. */
export async function requestDataExportAction(prev: PrivacyActionState): Promise<PrivacyActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  let result: Awaited<ReturnType<typeof requestDataExport>>;
  try {
    result = await requestDataExport();
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) return { status: "error", message: result.error, attempt };
  return { status: "success", message: "Vous recevrez un e-mail avec vos données sous 72\u00a0h.", attempt };
}

/** RGPD: sends the account deletion request to the auto-école. Invoices are kept by law. */
export async function requestAccountDeletionAction(prev: PrivacyActionState): Promise<PrivacyActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  let requestedAt: string | null;
  try {
    const result = await requestAccountDeletion();
    if (!result.ok) return { status: "error", message: result.error, attempt };
    requestedAt = await getDeletionRequest();
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: NETWORK_ERROR, attempt };
  }

  refresh();
  return {
    status: "success",
    message: "Votre demande de suppression a été envoyée à votre auto-école.",
    requestedAt: requestedAt ?? undefined,
    attempt,
  };
}
