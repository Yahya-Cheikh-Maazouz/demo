// State returned by the payment Server Actions to useActionState. Kept out of actions.ts because a
// "use server" file may only export async functions.

export type PaymentField = "packId" | "installmentId" | "method";

export type PaymentState = {
  status: "idle" | "success" | "error";
  /** Error ready to display (API refusal, offer no longer available…). */
  message?: string;
  fieldErrors?: Partial<Record<PaymentField, string>>;
  /** What was paid, to confirm it and link to the invoice. Set on success only. */
  receipt?: { invoiceNumber: string; label: string; amount: number; hours: number };
  /** Incremented on every submit, so a dialog only shows errors of its own attempts. */
  attempt?: number;
};

export const INITIAL_PAYMENT_STATE: PaymentState = { status: "idle" };
