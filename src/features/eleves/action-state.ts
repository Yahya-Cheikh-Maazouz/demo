// State returned by the student-file Server Actions. Kept out of actions.ts because a
// "use server" file may only export async functions.

export type StudentFileActionState = {
  status: "idle" | "success" | "error";
  code?: string;
  message?: string;
  /** Incremented on every submit: lets the UI react to a repeated identical result. */
  attempt?: number;
};

export const INITIAL_STUDENT_FILE_STATE: StudentFileActionState = { status: "idle" };
