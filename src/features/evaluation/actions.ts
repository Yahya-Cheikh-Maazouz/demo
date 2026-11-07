"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { submitStartingEvaluation } from "@/lib/api/eleve";
import { ANSWER_PREFIX, type EvaluationFormState } from "./action-state";

const NETWORK_ERROR = "Le serveur n'a pas répondu. Vos réponses n'ont pas été envoyées : vérifiez votre connexion puis réessayez.";

/** Sends the student's answers (one attempt). The API checks that every question is answered. */
export async function submitEvaluationAction(prev: EvaluationFormState, formData: FormData): Promise<EvaluationFormState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const answers: Record<string, string> = {};
  for (const [name, value] of formData) {
    if (name.startsWith(ANSWER_PREFIX) && typeof value === "string") answers[name.slice(ANSWER_PREFIX.length)] = value;
  }

  let result: Awaited<ReturnType<typeof submitStartingEvaluation>>;
  try {
    result = await submitStartingEvaluation(answers);
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: NETWORK_ERROR, attempt };
  }

  if (!result.ok) {
    // Already answered (e.g. in another tab): show the recorded result.
    if (result.code === "deja_fait") refresh();
    return { status: "error", code: result.code, message: result.error, fieldErrors: result.fieldErrors, attempt };
  }

  refresh();
  return { status: "success", result: result.data.result, attempt };
}
