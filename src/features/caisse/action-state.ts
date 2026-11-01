// State returned by the cash register Server Actions. Kept out of actions.ts because a
// "use server" file may only export async functions.

export type CashActionState = {
  status: "idle" | "success" | "error";
  code?: string;
  message?: string;
  fieldErrors?: Partial<Record<"studentId" | "amount" | "method" | "hours", string>>;
  /** Incremented on every submit: lets the UI react to a repeated identical result. */
  attempt?: number;
};

export const INITIAL_CASH_STATE: CashActionState = { status: "idle" };
