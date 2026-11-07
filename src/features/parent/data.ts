import { cache } from "react";
import {
  getChildAuthorisations,
  getChildDocuments,
  getChildLessons,
  getChildOverview,
  getChildPayments,
  getChildProgress,
  getParentAccount,
} from "@/lib/api/parent";

// The title of each page (with the child's first name) and its content stream in separate
// Suspense boundaries but need the same data: memoized for the request so the API is called once.

export const getPageAccount = cache(getParentAccount);
export const getPageOverview = cache(getChildOverview);
export const getPageLessons = cache(getChildLessons);
export const getPageProgress = cache(getChildProgress);
export const getPagePayments = cache(getChildPayments);
export const getPageDocuments = cache(getChildDocuments);
export const getPageAuthorisations = cache(getChildAuthorisations);
