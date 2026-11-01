import { cache } from "react";
import { getBalance, getInvoices, getPayments } from "@/lib/api/eleve";

/**
 * Several sections of a page stream in separate Suspense boundaries but read the same data:
 * memoized per request so the API is called once.
 */
export const getPageBalance = cache(getBalance);
export const getPageInvoices = cache(getInvoices);
export const getPagePayments = cache(getPayments);
