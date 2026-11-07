"use server";

import { refresh } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { cancelLesson, confirmReady, requestLesson } from "@/lib/api/eleve";
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
  const { late, chargedHours, request } = result.data;
  return {
    status: "success",
    message: request
      ? "Demande annulée. Le créneau est libéré."
      : chargedHours > 0
        ? `Leçon annulée. Annulation tardive : ${formatHours(chargedHours)} ${chargedHours > 1 ? "ont été décomptées" : "a été décomptée"} de votre solde.`
        : late
          ? "Leçon annulée. Aucune heure n'a été décomptée de votre solde."
          : "Leçon annulée sans frais. Le créneau est libéré.",
    attempt,
  };
}

const DURATIONS = new Set([1, 1.5, 2]);
const WEEK_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Sends a lesson request to the referent instructor, then goes back to the planning with a
 * confirmation banner. `acceptPendingPayment=1` sends it even if the credit does not cover it.
 */
export async function requestLessonAction(prev: PlanningActionState, formData: FormData): Promise<PlanningActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const type = readText(formData, "type");
  const start = readText(formData, "start");
  const duration = Number(readText(formData, "duration"));
  const weekStart = readText(formData, "weekStart");
  const acceptPendingPayment = readText(formData, "acceptPendingPayment") === "1";
  if ((type !== "conduite" && type !== "code") || Number.isNaN(Date.parse(start)) || !DURATIONS.has(duration)) {
    return { status: "error", code: "invalide", message: "Choisissez un créneau et une durée dans l'agenda.", attempt };
  }

  let result: Awaited<ReturnType<typeof requestLesson>>;
  try {
    result = await requestLesson({ type, start, durationHours: duration }, { acceptPendingPayment });
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }

  if (!result.ok) {
    // The agenda changed under the student's feet: re-render the grid with fresh data.
    if (result.code === "creneau_indisponible") refresh();
    return { status: "error", code: result.code, message: result.error, attempt };
  }

  const params = new URLSearchParams({ demande: result.data.lesson.id, type });
  if (WEEK_PATTERN.test(weekStart)) params.set("semaine", weekStart);
  redirect(`/eleve/planning?${params.toString()}#mes-rendez-vous`);
}

/** "Je suis prêt(e)": tells the instructor the student will be there. */
export async function readyForLessonAction(prev: PlanningActionState, formData: FormData): Promise<PlanningActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const lessonId = readText(formData, "lessonId");
  if (!ID_PATTERN.test(lessonId)) {
    return { status: "error", code: "introuvable", message: "Cette leçon est introuvable.", attempt };
  }
  try {
    const result = await confirmReady(lessonId);
    if (!result.ok) return { status: "error", code: result.code, message: result.error, attempt };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
  refresh();
  return { status: "success", message: "C'est noté : votre moniteur sait que vous serez là.", attempt };
}
