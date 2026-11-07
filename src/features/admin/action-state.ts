// States returned by the back-office Server Actions. Kept out of actions.ts because a
// "use server" file may only export async functions.

import type { CreatedSchool } from "@/lib/types";

export type CreateSchoolField = "name" | "siret" | "gerantEmail" | "planId" | "slug" | "trialDays";

export type CreateSchoolState = {
  status: "idle" | "success" | "error";
  code?: string;
  /** Error not tied to a field (network…). */
  message?: string;
  fieldErrors?: Partial<Record<CreateSchoolField, string>>;
  /** Submitted values to put back in the form. */
  values?: Partial<Record<CreateSchoolField, string>>;
  /** Shown once: the provisional password is never returned again. */
  created?: CreatedSchool;
  /** Incremented on every submit: keys the form (React resets its DOM after an action). */
  attempt?: number;
};

export const INITIAL_CREATE_SCHOOL_STATE: CreateSchoolState = { status: "idle" };

/** Status and plan changes of a school. */
export type SchoolActionState = {
  status: "idle" | "success" | "error";
  code?: string;
  message?: string;
  attempt?: number;
};

export const INITIAL_SCHOOL_ACTION_STATE: SchoolActionState = { status: "idle" };
