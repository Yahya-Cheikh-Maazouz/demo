// States returned by the profile Server Actions to useActionState. Kept out of actions.ts because
// a "use server" file may only export async functions.

export const CONTACT_FIELDS = ["email", "phone", "phoneSecondary", "line1", "postalCode", "city"] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

export type ContactFormState = {
  status: "idle" | "success" | "error";
  /** Error not tied to a field (network, 403…), or the success message. Ready to display. */
  message?: string;
  fieldErrors?: Partial<Record<ContactField, string>>;
  /** Submitted values, put back in the form after a failed submit. */
  values?: Partial<Record<ContactField, string>>;
  /** Incremented on every submit: keys the alerts so a repeated message is announced again. */
  attempt?: number;
};

export type PrivacyActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Account deletion: ISO date of the request, as recorded by the API. */
  requestedAt?: string;
  attempt?: number;
};

export const INITIAL_CONTACT_STATE: ContactFormState = { status: "idle" };
export const INITIAL_PRIVACY_STATE: PrivacyActionState = { status: "idle" };
