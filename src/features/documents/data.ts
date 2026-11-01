import { cache } from "react";
import { getDownloadableDocuments, getRequiredDocuments } from "@/lib/api/eleve";

/**
 * The progress summary and the list of pieces stream in separate Suspense boundaries but read the
 * same data: memoized per request so the API is called once.
 */
export const getPageRequiredDocuments = cache(getRequiredDocuments);
export const getPageDownloadables = cache(getDownloadableDocuments);
