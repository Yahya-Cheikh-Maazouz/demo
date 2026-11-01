"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { uploadRequiredDocument } from "@/lib/api/eleve";
import { DOCUMENT_ID_PATTERN } from "./document-meta";
import { checkFile, cleanFileName, sniffFileKind } from "./file-rules";
import type { UploadState } from "./upload-state";

const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez.";

/**
 * Sends a required document (field "file") for the piece "documentId".
 * The type and size are checked again here, and the first bytes must really be a PDF, JPG or PNG.
 * The backend stores the file, runs the antivirus and only then shows it to the school.
 */
export async function uploadDocumentAction(prev: UploadState, formData: FormData): Promise<UploadState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const documentId = formData.get("documentId");
  const file = formData.get("file");

  if (typeof documentId !== "string" || !DOCUMENT_ID_PATTERN.test(documentId)) {
    return { status: "error", code: "introuvable", message: "Cette pièce est introuvable. Rechargez la page.", attempt };
  }
  // An empty file input still sends a nameless File.
  if (!(file instanceof File) || !file.name) {
    return { status: "error", code: "fichier", message: "Choisissez un fichier à envoyer.", attempt };
  }

  const problem = checkFile(file);
  if (problem) return { status: "error", code: "fichier", message: problem, attempt };

  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  if (!sniffFileKind(head)) {
    return {
      status: "error",
      code: "fichier",
      message: "Ce fichier n'est pas lisible comme un PDF, un JPG ou un PNG. Exportez-le de nouveau puis réessayez.",
      attempt,
    };
  }

  let result: Awaited<ReturnType<typeof uploadRequiredDocument>>;
  try {
    result = await uploadRequiredDocument(documentId, cleanFileName(file.name));
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }

  if (!result.ok) {
    // The piece changed on the school's side (validated meanwhile…): show its real status.
    refresh();
    return { status: "error", code: result.code, message: result.error, attempt };
  }

  refresh();
  return {
    status: "success",
    message: "Fichier envoyé. Votre auto-école va le vérifier.",
    attempt,
  };
}
