// States returned by the parent space's Server Actions to useActionState. Kept out of actions.ts
// because a "use server" file may only export async functions.

type BaseState = {
  status: "idle" | "success" | "error";
  /** Error (network, refused by the API…) or the success message. Ready to display. */
  message?: string;
  /** Incremented on every submit: keys the alerts so a repeated message is announced again. */
  attempt?: number;
};

export type ConsentFormState = BaseState;

export type ValidationFormState = BaseState;

export type ParentPaymentState = BaseState & {
  fieldErrors?: { method?: string };
  /** What was paid, to confirm it. Set on success only. */
  receipt?: { invoiceNumber: string; label: string; amount: number; hours: number };
};

export type ParentPrivacyState = BaseState & {
  /** Account deletion: ISO date of the request, as recorded by the API. */
  requestedAt?: string;
};

export const INITIAL_CONSENT_STATE: ConsentFormState = { status: "idle" };
export const INITIAL_VALIDATION_STATE: ValidationFormState = { status: "idle" };
export const INITIAL_PARENT_PAYMENT_STATE: ParentPaymentState = { status: "idle" };
export const INITIAL_PARENT_PRIVACY_STATE: ParentPrivacyState = { status: "idle" };
