// State returned by the auth Server Actions to useActionState. Kept out of actions.ts because a
// "use server" file may only export async functions.

export type FormState<Field extends string> = {
  status: "idle" | "success" | "error";
  /** Error that is not tied to a field (bad credentials, lockout…). Ready to display. */
  message?: string;
  /** API error code, e.g. "identifiants_invalides" or "compte_bloque". */
  code?: string;
  fieldErrors?: Partial<Record<Field, string>>;
  /** Submitted values to put back in the form (never the password). */
  values?: Partial<Record<Field, string>>;
  /** Incremented on every submit: keys the error alert so a repeated error is announced again. */
  attempt?: number;
};

export type LoginState = FormState<"email" | "password">;
export type VerificationState = FormState<"code">;
export type ForgotPasswordState = FormState<"email">;

export const INITIAL_FORM_STATE = { status: "idle" } as const;
