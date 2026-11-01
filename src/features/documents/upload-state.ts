// State returned by the upload Server Action to useActionState. Kept out of actions.ts because a
// "use server" file may only export async functions.

export type UploadState = {
  status: "idle" | "success" | "error";
  /**
   * "fichier": the file itself is refused (type, size, content): the student must pick another one.
   * Otherwise the API code ("deja_valide", "introuvable"…) or "reseau".
   */
  code?: string;
  /** Ready-to-display message (success or error). */
  message?: string;
  /** Incremented on every submit, so the UI can tell a new result from an old one. */
  attempt?: number;
};

export const INITIAL_UPLOAD_STATE: UploadState = { status: "idle" };
