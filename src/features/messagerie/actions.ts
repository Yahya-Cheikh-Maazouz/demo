"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { markMessageRead, sendMessage } from "@/lib/api/eleve";
import type { MessageParty } from "@/lib/types";
import {
  BODY_MAX,
  SUBJECT_MAX,
  type MarkReadResult,
  type MessageField,
  type SendMessageState,
} from "./action-state";

const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez.";
const PARTIES: readonly string[] = ["moniteur", "ecole"] satisfies MessageParty[];
const FIELDS: readonly string[] = ["to", "subject", "body"] satisfies MessageField[];

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const isParty = (value: string): value is MessageParty => PARTIES.includes(value);

/** Keeps the API field errors this form can show next to a field; null when none is left. */
function formFieldErrors(errors: Record<string, string> | undefined): SendMessageState["fieldErrors"] | null {
  const entries = Object.entries(errors ?? {}).filter(([field]) => FIELDS.includes(field));
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

/** Sends a message to the student's instructor or to the auto-école. */
export async function sendMessageAction(prev: SendMessageState, formData: FormData): Promise<SendMessageState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const to = readText(formData, "to");
  const subject = readText(formData, "subject").replace(/\s+/g, " ");
  // Browsers submit line breaks as \r\n: count them as one character, like the textarea does.
  const body = readText(formData, "body").replace(/\r\n?/g, "\n");

  const fieldErrors: Partial<Record<MessageField, string>> = {};
  if (!isParty(to)) fieldErrors.to = "Choisissez le destinataire.";
  if (!subject) fieldErrors.subject = "Indiquez l'objet du message.";
  else if (subject.length > SUBJECT_MAX) fieldErrors.subject = `L'objet ne doit pas dépasser ${SUBJECT_MAX} caractères.`;
  if (!body) fieldErrors.body = "Écrivez votre message.";
  else if (body.length > BODY_MAX) fieldErrors.body = "Votre message ne doit pas dépasser 2 000 caractères.";
  if (!isParty(to) || Object.keys(fieldErrors).length > 0) return { status: "error", fieldErrors, attempt };

  let result: Awaited<ReturnType<typeof sendMessage>>;
  try {
    result = await sendMessage({ to, subject, body });
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) {
    const apiFieldErrors = result.code === "invalide" ? formFieldErrors(result.fieldErrors) : null;
    if (apiFieldErrors) return { status: "error", fieldErrors: apiFieldErrors, attempt };
    return { status: "error", message: result.error, attempt };
  }

  refresh();
  const { message } = result.data;
  return {
    status: "success",
    message: `Message envoyé à ${message.correspondent.name}.`,
    sentId: message.id,
    attempt,
  };
}

/** Called once when a received message is opened; refreshes the unread badges. */
export async function markMessageReadAction(messageId: string): Promise<MarkReadResult> {
  if (typeof messageId !== "string" || !messageId) return { ok: false };
  try {
    const result = await markMessageRead(messageId);
    if (!result.ok) return { ok: false };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false };
  }
  refresh();
  return { ok: true };
}
