// State returned by the planning Server Actions to useActionState. Kept out of actions.ts because
// a "use server" file may only export async functions.

export type PlanningActionState = {
  status: "idle" | "success" | "error";
  /** API error code, e.g. "creneau_indisponible", "limite_hebdomadaire", "solde_insuffisant". */
  code?: string;
  /** Ready-to-display message (success or error). */
  message?: string;
  /** Incremented on every submit: lets the UI react to a repeated identical error. */
  attempt?: number;
};

export const INITIAL_PLANNING_STATE: PlanningActionState = { status: "idle" };
