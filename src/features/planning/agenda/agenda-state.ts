// State returned by the staff planning Server Actions. Kept out of actions.ts because a
// "use server" file may only export async functions.

export type AgendaActionState = {
  status: "idle" | "success" | "error";
  /** API error code, e.g. "conflit", "interdit", "date_passee". */
  code?: string;
  /** Ready-to-display message (success or error). */
  message?: string;
  /** For code "conflit": one sentence per conflict. */
  conflicts?: string[];
  /** Incremented on every submit: lets the UI react to a repeated identical result. */
  attempt?: number;
};

export const INITIAL_AGENDA_STATE: AgendaActionState = { status: "idle" };
