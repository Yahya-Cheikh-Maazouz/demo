"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import {
  declareLeave,
  deleteLeave,
  markStudentAbsent,
  reviewRequest,
  signAndCompleteLesson,
  updateLessonLivret,
} from "@/lib/api/moniteur";
import { formatDateLong, formatTime } from "@/lib/format";
import { parisDateTime } from "@/lib/paris-time";
import type { LeaveReason } from "@/lib/types";
import { LIVRET_NOTE_MAX, type InstructorActionState, type LeaveActionState, type LeaveField } from "./action-state";
import { deName, guillemets } from "./french";

// Ids are opaque to the UI: only check they look like ids before calling the API.
const ID_PATTERN = /^[\w:.-]{1,160}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** A competence level as posted by the livret form: a whole number, 0 to 100. */
const LEVEL_PATTERN = /^\d{1,3}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const REASONS: LeaveReason[] = ["Congés", "Maladie", "Formation", "Autre"];
/** Data URL of the drawn signature: 200 Ko once decoded, about 4/3 of that in base64. */
const SIGNATURE_MAX_CHARS = Math.ceil((200 * 1024 * 4) / 3) + 64;

const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez.";

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** "2026-11-12" naming a real calendar day ("2026-02-31" does not). */
function isCalendarDay(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** "jeudi 12 novembre à 08:00", in the middle of a sentence. */
const when = (iso: string) => `${formatDateLong(iso).toLowerCase()} à ${formatTime(iso)}`;

/** Confirms or refuses a student's request. */
export async function reviewRequestAction(prev: InstructorActionState, formData: FormData): Promise<InstructorActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const lessonId = readText(formData, "lessonId");
  const decision = readText(formData, "decision");
  if (!ID_PATTERN.test(lessonId) || (decision !== "accepte" && decision !== "refuse")) {
    return { status: "error", code: "introuvable", message: "Cette demande est introuvable.", attempt };
  }
  let result: Awaited<ReturnType<typeof reviewRequest>>;
  try {
    result = await reviewRequest(lessonId, decision);
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) {
    // Already handled elsewhere (the agency, another tab): show the list as it is now.
    if (result.code === "deja_traitee" || result.code === "introuvable" || result.code === "expiree") refresh();
    return { status: "error", code: result.code, message: result.error, attempt };
  }
  refresh();
  const { lesson } = result.data;
  const name = `${lesson.student.firstName} ${lesson.student.lastName}`;
  if (decision === "refuse") {
    return { status: "success", message: `Demande ${deName(name)} refusée : le créneau est libéré.`, attempt };
  }
  return {
    status: "success",
    code: lesson.status,
    message:
      lesson.status === "attente_paiement"
        ? `Leçon confirmée avec ${name}, ${when(lesson.start)}. Paiement à régulariser : l'élève doit passer à l'accueil avant la leçon.`
        : `Leçon confirmée avec ${name}, ${when(lesson.start)}. L'élève la voit ${guillemets("Planifié")}.`,
    attempt,
  };
}

/** Émargement: stores the student's signature and marks the lesson done. */
export async function signLessonAction(prev: InstructorActionState, formData: FormData): Promise<InstructorActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const lessonId = readText(formData, "lessonId");
  const signature = readText(formData, "signature");
  if (!ID_PATTERN.test(lessonId)) {
    return { status: "error", code: "introuvable", message: "Cette leçon est introuvable.", attempt };
  }
  if (!signature.startsWith("data:image/png;base64,")) {
    return { status: "error", code: "signature_manquante", message: "Faites signer l'élève dans le cadre avant de valider.", attempt };
  }
  if (signature.length > SIGNATURE_MAX_CHARS) {
    return {
      status: "error",
      code: "signature_trop_lourde",
      message: "La signature est trop lourde (200 Ko au plus). Effacez-la et recommencez.",
      attempt,
    };
  }
  let result: Awaited<ReturnType<typeof signAndCompleteLesson>>;
  try {
    result = await signAndCompleteLesson(lessonId, signature);
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) {
    if (result.code === "deja_cloturee") refresh();
    return { status: "error", code: result.code, message: result.error, attempt };
  }
  refresh();
  const { student } = result.data.lesson;
  return { status: "success", message: `Leçon validée : ${student.firstName} ${student.lastName} a émargé.`, attempt };
}

/** The student did not come. */
export async function markAbsentAction(prev: InstructorActionState, formData: FormData): Promise<InstructorActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const lessonId = readText(formData, "lessonId");
  if (!ID_PATTERN.test(lessonId)) {
    return { status: "error", code: "introuvable", message: "Cette leçon est introuvable.", attempt };
  }
  let result: Awaited<ReturnType<typeof markStudentAbsent>>;
  try {
    result = await markStudentAbsent(lessonId);
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) {
    if (result.code === "deja_cloturee") refresh();
    return { status: "error", code: result.code, message: result.error, attempt };
  }
  refresh();
  const { student } = result.data.lesson;
  return { status: "success", message: `Absence ${deName(`${student.firstName} ${student.lastName}`)} enregistrée. L'accueil en est informé.`, attempt };
}

const LIVRET_CODES = ["C1", "C2", "C3", "C4"];

/** The 4 levels posted under `prefix` + code ("C1", or "avant-C1" for the baseline), or null if one is not a valid level. */
function readLevels(formData: FormData, prefix = ""): number[] | null {
  const raw = LIVRET_CODES.map((code) => readText(formData, `${prefix}${code}`));
  if (raw.some((value) => !LEVEL_PATTERN.test(value))) return null;
  const levels = raw.map(Number);
  return levels.every((level) => level <= 100) ? levels : null;
}

/** C1–C4 levels and the optional comment after the lesson. */
export async function updateLivretAction(prev: InstructorActionState, formData: FormData): Promise<InstructorActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const lessonId = readText(formData, "lessonId");
  const progress = readLevels(formData);
  const baseline = readLevels(formData, "avant-");
  const note = readText(formData, "note").trim();
  if (!ID_PATTERN.test(lessonId)) {
    return { status: "error", code: "introuvable", message: "Cette leçon est introuvable.", attempt };
  }
  if (!progress || !baseline) {
    return { status: "error", code: "invalide", message: "Les niveaux vont de 0 à 100 %.", attempt };
  }
  if (note.length > LIVRET_NOTE_MAX) {
    return { status: "error", code: "invalide", message: `Le retour fait ${LIVRET_NOTE_MAX} caractères au plus.`, attempt };
  }
  const changed = progress.some((level, i) => level !== baseline[i]);
  if (!changed && !note) {
    return { status: "info", code: "inchange", message: "Rien à enregistrer : changez un niveau ou écrivez un retour.", attempt };
  }
  let result: Awaited<ReturnType<typeof updateLessonLivret>>;
  try {
    result = await updateLessonLivret(lessonId, { progress, baseline, note: note || null });
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) {
    // Changed meanwhile: show the stored levels, the instructor checks them and saves again.
    if (result.code === "modifie") refresh();
    if (result.code === "inchange") return { status: "info", code: result.code, message: result.error, attempt };
    return { status: "error", code: result.code, message: result.error, attempt };
  }
  refresh();
  const message =
    changed && note
      ? "Livret et retour enregistrés : l'élève et ses parents les voient dans leur suivi."
      : changed
        ? "Niveaux enregistrés : l'élève et ses parents les voient dans leur suivi."
        : "Retour enregistré : l'élève et ses parents le lisent dans leur suivi.";
  return { status: "success", message, attempt };
}

const LEAVE_FIELD_OF: Record<string, LeaveField> = { start: "startDate", end: "endDate", reason: "reason" };

/** Declares a leave from date + time fields (Paris time). */
export async function declareLeaveAction(prev: LeaveActionState, formData: FormData): Promise<LeaveActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const startDate = readText(formData, "startDate");
  const startTime = readText(formData, "startTime");
  const endDate = readText(formData, "endDate");
  const endTime = readText(formData, "endTime");
  const reason = readText(formData, "reason") as LeaveReason;

  const fieldErrors: LeaveActionState["fieldErrors"] = {};
  if (!isCalendarDay(startDate)) fieldErrors.startDate = "Indiquez le jour de début.";
  if (!TIME_PATTERN.test(startTime)) fieldErrors.startTime = "Indiquez l'heure de début.";
  if (!isCalendarDay(endDate)) fieldErrors.endDate = "Indiquez le jour de fin.";
  if (!TIME_PATTERN.test(endTime)) fieldErrors.endTime = "Indiquez l'heure de fin.";
  if (!REASONS.includes(reason)) fieldErrors.reason = "Choisissez un motif.";
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", code: "invalide", message: "Vérifiez les champs signalés.", fieldErrors, attempt };
  }

  const at = (date: string, time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    return parisDateTime(date, hour, minute).toISOString();
  };
  let result: Awaited<ReturnType<typeof declareLeave>>;
  try {
    result = await declareLeave({ start: at(startDate, startTime), end: at(endDate, endTime), reason });
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) {
    const mapped: LeaveActionState["fieldErrors"] = {};
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      const target = LEAVE_FIELD_OF[field];
      if (target) mapped[target] = message;
    }
    return {
      status: "error",
      code: result.code,
      message: result.error,
      fieldErrors: Object.keys(mapped).length > 0 ? mapped : undefined,
      conflicts: result.conflicts,
      attempt,
    };
  }
  refresh();
  const { leave } = result.data;
  return {
    status: "success",
    message: `Du ${when(leave.start)} au ${when(leave.end)}. Les élèves ne peuvent plus demander ces créneaux.`,
    attempt,
  };
}

/** Deletes a leave the instructor declared, before it starts. */
export async function deleteLeaveAction(prev: InstructorActionState, formData: FormData): Promise<InstructorActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const leaveId = readText(formData, "leaveId");
  if (!ID_PATTERN.test(leaveId)) {
    return { status: "error", code: "introuvable", message: "Cette indisponibilité est introuvable.", attempt };
  }
  let result: Awaited<ReturnType<typeof deleteLeave>>;
  try {
    result = await deleteLeave(leaveId);
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
  if (!result.ok) {
    if (result.code === "introuvable") refresh();
    return { status: "error", code: result.code, message: result.error, attempt };
  }
  refresh();
  return { status: "success", message: "Indisponibilité supprimée : ces créneaux sont de nouveau ouverts aux élèves.", attempt };
}
