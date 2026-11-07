// States returned by the instructor Server Actions to useActionState. Kept out of actions.ts
// because a "use server" file may only export async functions.

import type { LeaveConflict } from "@/lib/types";

export type InstructorActionState = {
  status: "idle" | "success" | "error";
  /** API error code, e.g. "deja_traitee", "pas_commence", "lecture_seule". */
  code?: string;
  /** Ready-to-display message (success or error). */
  message?: string;
  /** Incremented on every submit: keys controlled forms (React resets them after an action) and alerts. */
  attempt?: number;
};

export const INITIAL_INSTRUCTOR_STATE: InstructorActionState = { status: "idle" };

export type LeaveField = "startDate" | "startTime" | "endDate" | "endTime" | "reason";

export type LeaveActionState = InstructorActionState & {
  fieldErrors?: Partial<Record<LeaveField, string>>;
  /** Code "conflit": the lessons to move first. */
  conflicts?: LeaveConflict[];
};

export const INITIAL_LEAVE_STATE: LeaveActionState = { status: "idle" };

/** Comment after a lesson, as limited by the API. */
export const LIVRET_NOTE_MAX = 1000;
/** −/+ step of the competence levels. */
export const LIVRET_STEP = 5;
