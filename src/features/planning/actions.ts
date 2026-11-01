"use server";

import { refresh } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { bookSlot, cancelLesson } from "@/lib/api/eleve";
import { formatHours } from "@/lib/format";
import type { PlanningActionState } from "./action-state";

// Lesson and slot ids are opaque to the UI: only check they look like ids before calling the API.
const ID_PATTERN = /^[\w:.-]{1,160}$/;

const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez.";

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Cancels one of the student's lessons. The API decides whether it is late and what is charged. */
export async function cancelLessonAction(
  prev: PlanningActionState,
  formData: FormData,
): Promise<PlanningActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const lessonId = readText(formData, "lessonId");
  if (!ID_PATTERN.test(lessonId)) {
    return { status: "error", code: "introuvable", message: "Cette leçon est introuvable.", attempt };
  }

  let result: Awaited<ReturnType<typeof cancelLesson>>;
  try {
    result = await cancelLesson(lessonId);
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) return { status: "error", code: result.code, message: result.error, attempt };

  refresh();
  const { late, chargedHours } = result.data;
  return {
    status: "success",
    message:
      chargedHours > 0
        ? `Leçon annulée. Annulation tardive : ${formatHours(chargedHours)} ${chargedHours > 1 ? "ont été décomptées" : "a été décomptée"} de votre solde.`
        : late
          ? "Leçon annulée. Aucune heure n'a été décomptée de votre solde."
          : "Leçon annulée sans frais. Le créneau est libéré.",
    attempt,
  };
}

/**
 * Books a free slot, then goes back to the planning with a confirmation banner.
 * `acceptPendingPayment=1` sends the booking even if the balance does not cover it
 * (the lesson is then "en attente de paiement").
 */
export async function bookSlotAction(prev: PlanningActionState, formData: FormData): Promise<PlanningActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const slotId = readText(formData, "slotId");
  const acceptPendingPayment = readText(formData, "acceptPendingPayment") === "1";
  if (!ID_PATTERN.test(slotId)) {
    return {
      status: "error",
      code: "creneau_indisponible",
      message: "Ce créneau n'est plus disponible. Choisissez-en un autre.",
      attempt,
    };
  }

  let result: Awaited<ReturnType<typeof bookSlot>>;
  try {
    result = await bookSlot(slotId, { acceptPendingPayment });
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }

  if (!result.ok) {
    // The free slots changed under the student's feet: re-render the list with fresh data.
    if (result.code === "creneau_indisponible") refresh();
    return { status: "error", code: result.code, message: result.error, attempt };
  }

  const { lesson } = result.data;
  const params = new URLSearchParams({ reservee: "1", lecon: lesson.id });
  if (lesson.status === "attente_paiement") params.set("attente", "1");
  redirect(`/eleve/planning?${params.toString()}`);
}
