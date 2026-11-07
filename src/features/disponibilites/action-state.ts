// State returned by the availabilities Server Action to useActionState. Kept out of actions.ts
// because a "use server" file may only export async functions.

import type { CellKey } from "./periods";

export type AvailabilityFormState = {
  status: "idle" | "success" | "error";
  /** Error (network, refused by the API…) or the success message. Ready to display. */
  message?: string;
  /** After a save: the cells as recorded by the API. */
  cells?: CellKey[];
  /** Incremented on every submit: keys the form and the alerts. */
  attempt?: number;
};

export const INITIAL_AVAILABILITY_STATE: AvailabilityFormState = { status: "idle" };
