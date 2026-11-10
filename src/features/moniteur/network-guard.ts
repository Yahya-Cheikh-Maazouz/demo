import { unstable_rethrow } from "next/navigation";
import type { InstructorActionState } from "./action-state";

/** Shown when a Server Action never got its answer (weak signal in the car, network cut). */
export const NETWORK_LOST_MESSAGE =
  "Pas de réponse du serveur : le réseau a peut-être coupé. Vérifiez votre connexion, puis réessayez.";

/**
 * Client side of an instructor action. When the request itself fails (`TypeError: Failed to
 * fetch` while the phone still reports a connection), the error would otherwise reach
 * /moniteur/error.tsx and replace the whole screen, losing what was typed or drawn. It becomes an
 * error state instead, so the form, the dialog and the signature stay in place. Next.js
 * redirects (a lost session) are rethrown as usual.
 */
export function guardNetwork<S extends InstructorActionState>(action: (prev: S, formData: FormData) => Promise<S>) {
  return async (prev: S, formData: FormData): Promise<S> => {
    try {
      return await action(prev, formData);
    } catch (error) {
      unstable_rethrow(error);
      // Extra fields of a state (field errors, conflicts) all are optional: none applies here.
      const failed: InstructorActionState = { status: "error", code: "reseau", message: NETWORK_LOST_MESSAGE, attempt: (prev.attempt ?? 0) + 1 };
      return failed as S;
    }
  };
}
