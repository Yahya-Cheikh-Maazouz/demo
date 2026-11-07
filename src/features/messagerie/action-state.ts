// States returned by the messaging Server Actions. Kept out of actions.ts because a
// "use server" file may only export async functions.

/** Limits enforced by the API (the form uses them for maxLength). */
export const SUBJECT_MAX = 120;
export const BODY_MAX = 2000;

export type MessageField = "to" | "subject" | "body";

export type SendMessageState = {
  status: "idle" | "success" | "error";
  /** Error not tied to a field (network, 403, read-only mode…), or the success message. Ready to display. */
  message?: string;
  fieldErrors?: Partial<Record<MessageField, string>>;
  /** Success: id of the message just sent, highlighted in "Envoyés". */
  sentId?: string;
  /** Incremented on every submit: keys the form (React resets it after an action) and the alerts. */
  attempt?: number;
};

export const INITIAL_SEND_STATE: SendMessageState = { status: "idle" };

export type MarkReadResult = { ok: boolean };
