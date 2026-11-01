"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { reviewDocument, setStudentArchived } from "@/lib/api/gestion";
import type { StudentFileActionState } from "./action-state";

const ID = /^[\w:.-]{1,160}$/;
const MAX_REASON = 300;
const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez.";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** decision=valide, or decision=refuse with a reason the student will read. */
export async function reviewDocumentAction(
  prev: StudentFileActionState,
  formData: FormData,
): Promise<StudentFileActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const studentId = read(formData, "studentId");
  const documentId = read(formData, "documentId");
  const decision = read(formData, "decision");
  const reason = read(formData, "reason");
  if (!ID.test(studentId) || !ID.test(documentId) || (decision !== "valide" && decision !== "refuse")) {
    return { status: "error", code: "invalide", message: "Action impossible sur cette pièce.", attempt };
  }
  if (decision === "refuse" && reason.length < 5) {
    return { status: "error", code: "motif", message: "Indiquez le motif du refus : l'élève le verra.", attempt };
  }

  try {
    const result = await reviewDocument(studentId, documentId, decision, reason.slice(0, MAX_REASON));
    if (!result.ok) return { status: "error", code: result.code, message: result.error, attempt };
    refresh();
    return {
      status: "success",
      message: decision === "valide" ? "Pièce validée." : "Pièce refusée. L'élève est invité à en envoyer une nouvelle.",
      attempt,
    };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
}

/** archived=1 archives the student (they no longer appear in the lists), archived=0 restores them. */
export async function archiveStudentAction(
  prev: StudentFileActionState,
  formData: FormData,
): Promise<StudentFileActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const studentId = read(formData, "studentId");
  const archived = read(formData, "archived") === "1";
  if (!ID.test(studentId)) return { status: "error", code: "invalide", message: "Élève introuvable.", attempt };

  try {
    const result = await setStudentArchived(studentId, archived);
    if (!result.ok) return { status: "error", code: result.code, message: result.error, attempt };
    refresh();
    return { status: "success", message: archived ? "Élève archivé." : "Élève réactivé.", attempt };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
}
