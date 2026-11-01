import { cache } from "react";
import { getDeletionRequest, getNow, getStudentProfile } from "@/lib/api/eleve";

/**
 * The profile page streams several cards in separate Suspense boundaries that read the same
 * data: memoized per request so the API is called once.
 */
export const getPageProfile = cache(getStudentProfile);
export const getPageNow = cache(getNow);
export const getPageDeletionRequest = cache(getDeletionRequest);
