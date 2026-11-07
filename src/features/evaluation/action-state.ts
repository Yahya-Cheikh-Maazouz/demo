// State returned by the starting evaluation Server Action to useActionState. Kept out of
// actions.ts because a "use server" file may only export async functions.

import type { EvaluationResult } from "@/lib/types";

/** Radio groups are named "reponse:<question id>". */
export const ANSWER_PREFIX = "reponse:";

export type EvaluationFormState = {
  status: "idle" | "success" | "error";
  /** API error code: "incomplet", "deja_fait"… */
  code?: string;
  /** Error not tied to a question. Ready to display. */
  message?: string;
  /** Keyed by question id. */
  fieldErrors?: Record<string, string>;
  result?: EvaluationResult;
  /** Incremented on every submit: keys the form and the alerts. */
  attempt?: number;
};

export const INITIAL_EVALUATION_STATE: EvaluationFormState = { status: "idle" };
