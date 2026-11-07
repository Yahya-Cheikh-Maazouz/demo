// State returned by the subscription Server Actions. Kept out of actions.ts because a
// "use server" file may only export async functions.

export type RegularizeState = {
  status: "idle" | "success" | "error";
  code?: string;
  message?: string;
  /** Incremented on every submit: lets the UI react to a repeated identical result. */
  attempt?: number;
};

export const INITIAL_REGULARIZE_STATE: RegularizeState = { status: "idle" };
