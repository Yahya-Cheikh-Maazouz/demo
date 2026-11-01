"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { createLesson, moveLesson, setLessonStatus } from "@/lib/api/gestion";
import { formatDateLong, formatHours, formatTime } from "@/lib/format";
import { parisDateTime } from "@/lib/paris-time";
import type { ActionResult, LessonType } from "@/lib/types";
import type { AgendaActionState } from "./agenda-state";

// Ids are opaque to the UI: only check they look like ids before calling the API.
const ID = /^[\w:.-]{1,160}$/;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TYPES: LessonType[] = ["conduite", "code", "examen_blanc", "examen"];
const DURATIONS = [1, 1.5, 2];

const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez.";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function failure<T>(result: Extract<ActionResult<T>, { ok: false }>, attempt: number): AgendaActionState {
  if (result.code === "conflit") {
    return { status: "error", code: "conflit", message: "Ce créneau est en conflit.", conflicts: result.error.split("\n"), attempt };
  }
  return { status: "error", code: result.code, message: result.error, attempt };
}

/** "le lundi 2 novembre à 18:00" */
const when = (iso: string) => `le ${formatDateLong(iso).toLowerCase()} à ${formatTime(iso)}`;

/**
 * Creates a lesson, or moves it when `lessonId` is set. The "Forcer" submit button sends force=1
 * (the API only accepts it from someone with "planning.forcer").
 */
export async function saveLessonAction(prev: AgendaActionState, formData: FormData): Promise<AgendaActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const lessonId = read(formData, "lessonId");
  const date = read(formData, "date");
  const time = read(formData, "time");
  const instructorId = read(formData, "instructorId");
  const force = read(formData, "force") === "1";

  if (!DAY_KEY.test(date) || !TIME.test(time)) {
    return { status: "error", code: "date_invalide", message: "Choisissez une date et une heure.", attempt };
  }
  if (!ID.test(instructorId)) {
    return { status: "error", code: "moniteur", message: "Choisissez un moniteur.", attempt };
  }
  const [hour, minute] = time.split(":").map(Number);
  const start = parisDateTime(date, hour, minute).toISOString();

  try {
    if (lessonId) {
      if (!ID.test(lessonId)) return { status: "error", code: "introuvable", message: "Ce RDV est introuvable.", attempt };
      const result = await moveLesson(lessonId, { start, instructorId }, { force });
      if (!result.ok) return failure(result, attempt);
      refresh();
      return { status: "success", message: `RDV déplacé ${when(start)}.`, attempt };
    }

    const studentId = read(formData, "studentId");
    const type = read(formData, "type") as LessonType;
    const vehicle = read(formData, "vehicleId");
    const duration = Number(read(formData, "duration"));
    if (!ID.test(studentId)) return { status: "error", code: "eleve", message: "Choisissez un élève.", attempt };
    if (!TYPES.includes(type)) return { status: "error", code: "type", message: "Choisissez le type de RDV.", attempt };
    if (!DURATIONS.includes(duration)) return { status: "error", code: "duree", message: "Choisissez une durée.", attempt };
    if (vehicle !== "auto" && vehicle !== "aucun" && !ID.test(vehicle)) {
      return { status: "error", code: "vehicule", message: "Choisissez un véhicule.", attempt };
    }

    const result = await createLesson(
      {
        studentId,
        type,
        instructorId,
        vehicleId: vehicle === "aucun" ? null : vehicle,
        start,
        durationHours: duration,
      },
      { force },
    );
    if (!result.ok) return failure(result, attempt);
    refresh();
    return {
      status: "success",
      message: result.data.pendingPayment
        ? `RDV enregistré ${when(start)}. L'élève n'a pas assez d'heures payées : il est en attente de paiement.`
        : `RDV enregistré ${when(start)}.`,
      attempt,
    };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
}

/** Drag and drop: moves a lesson to `start` (ISO) with `instructorId`. */
export async function moveLessonAction(
  lessonId: string,
  start: string,
  instructorId: string,
  force: boolean,
): Promise<AgendaActionState> {
  if (!ID.test(lessonId) || !ID.test(instructorId) || Number.isNaN(Date.parse(start))) {
    return { status: "error", code: "invalide", message: "Ce déplacement n'est pas possible." };
  }
  try {
    const result = await moveLesson(lessonId, { start, instructorId }, { force: force === true });
    if (!result.ok) return failure(result, 1);
    refresh();
    return { status: "success", message: `RDV déplacé ${when(result.data.lesson.start)}.` };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR };
  }
}

/** status=effectue, status=annule, or status=absent (no-show: cancelled and charged). */
export async function lessonStatusAction(prev: AgendaActionState, formData: FormData): Promise<AgendaActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const lessonId = read(formData, "lessonId");
  const status = read(formData, "status");
  if (!ID.test(lessonId) || !["effectue", "annule", "absent"].includes(status)) {
    return { status: "error", code: "invalide", message: "Action impossible sur ce RDV.", attempt };
  }

  try {
    const result = await setLessonStatus(lessonId, status === "effectue" ? "effectue" : "annule", {
      noShow: status === "absent",
    });
    if (!result.ok) return failure(result, attempt);
    refresh();
    const charged = result.data.chargedHours;
    const message =
      status === "effectue"
        ? "Leçon marquée comme effectuée."
        : status === "absent"
          ? `Absence enregistrée : ${formatHours(charged)} ${charged > 1 ? "décomptées" : "décomptée"} du solde de l'élève.`
          : charged > 0
            ? `RDV annulé (annulation tardive) : ${formatHours(charged)} ${charged > 1 ? "décomptées" : "décomptée"} du solde.`
            : "RDV annulé. Le créneau est libéré.";
    return { status: "success", message, attempt };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
}
