import { cache } from "react";
import { getLessons } from "@/lib/api/eleve";

/**
 * "Prochaine leçon" and "À venir" stream in separate Suspense boundaries but need the same list:
 * memoized for the request so the API is called once.
 */
export const getHomeLessons = cache(getLessons);
